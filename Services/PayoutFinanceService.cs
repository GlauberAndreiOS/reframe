using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Services;

public interface IPayoutFinanceService
{
    bool ValidateHolderOwnership(Psychologist psychologist, UpsertTherapistPayoutAccountDto dto, out string? reason);
    DateTime CalculateExpectedReleaseAt(DateTime paymentConfirmedAtUtc, TherapistPayoutPolicy policy);
    (decimal platformFee, decimal netAmount) CalculateNetAmounts(decimal grossAmount, TherapistPayoutPolicy policy);
    Task<IReadOnlyList<TherapistLedgerTransaction>> RunReconciliationAsync(Guid psychologistId, IReadOnlyList<MercadoPagoReconciliationItemDto> transactions);
}

public class PayoutFinanceService(ApplicationDbContext context) : IPayoutFinanceService
{
    public bool ValidateHolderOwnership(Psychologist psychologist, UpsertTherapistPayoutAccountDto dto, out string? reason)
    {
        var normalizedHolderDocument = new string((dto.HolderDocument ?? string.Empty).Where(char.IsDigit).ToArray());
        var psychologistCpf = new string((psychologist.User?.Cpf ?? string.Empty).Where(char.IsDigit).ToArray());

        if (string.IsNullOrWhiteSpace(dto.HolderName))
        {
            reason = "Holder name is required.";
            return false;
        }

        if (normalizedHolderDocument.Length != 11)
        {
            reason = "Holder document must contain 11 digits.";
            return false;
        }

        if (string.IsNullOrEmpty(psychologistCpf) || psychologistCpf.Length != 11)
        {
            reason = "Psychologist CPF is missing or invalid in profile.";
            return false;
        }

        if (!string.Equals(normalizedHolderDocument, psychologistCpf, StringComparison.Ordinal))
        {
            reason = "Holder document must match psychologist CPF.";
            return false;
        }

        reason = null;
        return true;
    }

    public DateTime CalculateExpectedReleaseAt(DateTime paymentConfirmedAtUtc, TherapistPayoutPolicy policy)
    {
        if (policy.ReleasePolicy == PayoutReleasePolicy.ImmediateAfterConfirmation)
            return paymentConfirmedAtUtc;

        var delay = Math.Max(0, policy.ReleaseDelayDays);
        return paymentConfirmedAtUtc.AddDays(delay);
    }

    public (decimal platformFee, decimal netAmount) CalculateNetAmounts(decimal grossAmount, TherapistPayoutPolicy policy)
    {
        var feePercentAmount = grossAmount * (policy.PlatformFeePercent / 100m);
        var reserveAmount = grossAmount * (policy.FutureChargebackReservePercent / 100m);
        var platformFee = Math.Round(policy.PlatformFeeFixed + feePercentAmount + reserveAmount, 2, MidpointRounding.AwayFromZero);
        var netAmount = Math.Round(grossAmount - platformFee, 2, MidpointRounding.AwayFromZero);
        return (platformFee, netAmount);
    }

    public async Task<IReadOnlyList<TherapistLedgerTransaction>> RunReconciliationAsync(
        Guid psychologistId,
        IReadOnlyList<MercadoPagoReconciliationItemDto> transactions)
    {
        var policy = await context.TherapistPayoutPolicies.FirstOrDefaultAsync(p => p.PsychologistId == psychologistId)
            ?? new TherapistPayoutPolicy { PsychologistId = psychologistId };

        var now = DateTime.UtcNow;
        var results = new List<TherapistLedgerTransaction>();

        foreach (var externalTx in transactions)
        {
            var entry = await context.TherapistLedgerTransactions
                .FirstOrDefaultAsync(t => t.PsychologistId == psychologistId && t.MercadoPagoTransactionId == externalTx.MercadoPagoTransactionId);

            if (entry == null)
            {
                var amounts = CalculateNetAmounts(externalTx.GrossAmount, policy);
                entry = new TherapistLedgerTransaction
                {
                    Id = Guid.NewGuid(),
                    PsychologistId = psychologistId,
                    MercadoPagoTransactionId = externalTx.MercadoPagoTransactionId,
                    GrossAmount = externalTx.GrossAmount,
                    PlatformFeeAmount = amounts.platformFee,
                    NetAmount = amounts.netAmount,
                    PaymentConfirmedAtUtc = externalTx.PaymentConfirmedAtUtc,
                    ExpectedReleaseAtUtc = CalculateExpectedReleaseAt(externalTx.PaymentConfirmedAtUtc, policy),
                };
                context.TherapistLedgerTransactions.Add(entry);
            }

            entry.MercadoPagoStatus = externalTx.MercadoPagoStatus;
            entry.LastReconciledAtUtc = now;

            if (externalTx.IsChargeback)
            {
                entry.ReleaseStatus = LedgerReleaseStatus.Reversed;
                entry.ReversedAtUtc = now;
                entry.ReconciliationNotes = "Chargeback detected from Mercado Pago reconciliation.";
            }
            else if (externalTx.IsDisputeOpen)
            {
                entry.ReleaseStatus = LedgerReleaseStatus.BlockedForDispute;
                entry.BlockedAtUtc = now;
                entry.ReconciliationNotes = "Transaction blocked due to dispute in Mercado Pago.";
            }
            else if (entry.ReleaseStatus != LedgerReleaseStatus.Released)
            {
                entry.ReleaseStatus = now >= entry.ExpectedReleaseAtUtc
                    ? LedgerReleaseStatus.Released
                    : LedgerReleaseStatus.ToRelease;

                if (entry.ReleaseStatus == LedgerReleaseStatus.Released && entry.ReleasedAtUtc == null)
                    entry.ReleasedAtUtc = now;

                entry.ReconciliationNotes = "Status synced with Mercado Pago and payout policy.";
            }

            results.Add(entry);
        }

        await context.SaveChangesAsync();
        return results;
    }
}
