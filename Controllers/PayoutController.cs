using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;
using reframe.Services;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Psychologist")]
public class PayoutController(ApplicationDbContext context, IPayoutFinanceService payoutFinanceService) : ControllerBase
{
    [HttpPut("account")]
    public async Task<IActionResult> UpsertPayoutAccount([FromBody] UpsertTherapistPayoutAccountDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null)
            return NotFound("Psychologist profile not found.");

        if (!payoutFinanceService.ValidateHolderOwnership(psychologist, dto, out var validationReason))
            return BadRequest(validationReason ?? "Unable to validate account holder ownership.");

        if (dto.Method == PayoutMethod.Pix && string.IsNullOrWhiteSpace(dto.PixKey))
            return BadRequest("Pix key is required for pix payout method.");

        if (dto.Method == PayoutMethod.BankTransfer && (string.IsNullOrWhiteSpace(dto.BankCode) || string.IsNullOrWhiteSpace(dto.BankAccountNumber)))
            return BadRequest("Bank code and account number are required for bank transfer payout method.");

        var account = await context.TherapistPayoutAccounts.FirstOrDefaultAsync(a => a.PsychologistId == psychologist.Id);
        if (account == null)
        {
            account = new TherapistPayoutAccount
            {
                Id = Guid.NewGuid(),
                PsychologistId = psychologist.Id,
            };
            context.TherapistPayoutAccounts.Add(account);
        }

        account.Method = dto.Method;
        account.PixKeyType = dto.PixKeyType;
        account.PixKey = dto.PixKey;
        account.BankCode = dto.BankCode;
        account.BankBranch = dto.BankBranch;
        account.BankAccountNumber = dto.BankAccountNumber;
        account.BankAccountDigit = dto.BankAccountDigit;
        account.HolderName = dto.HolderName.Trim();
        account.HolderDocument = new string(dto.HolderDocument.Where(char.IsDigit).ToArray());
        account.IsHolderValidated = true;
        account.HolderValidationMessage = "Holder ownership validated against psychologist CPF.";
        account.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return Ok(account);
    }

    [HttpPut("policy")]
    public async Task<IActionResult> UpsertPolicy([FromBody] UpsertTherapistPayoutPolicyDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null)
            return NotFound("Psychologist profile not found.");

        if (dto.PlatformFeePercent < 0 || dto.FutureChargebackReservePercent < 0 || dto.PlatformFeeFixed < 0)
            return BadRequest("Fee and reserve values must be greater than or equal to zero.");

        if (dto.ReleasePolicy == PayoutReleasePolicy.DPlusN && (!dto.ReleaseDelayDays.HasValue || dto.ReleaseDelayDays < 0))
            return BadRequest("Release delay days must be informed for D+N release policy.");

        var policy = await context.TherapistPayoutPolicies.FirstOrDefaultAsync(p => p.PsychologistId == psychologist.Id);
        if (policy == null)
        {
            policy = new TherapistPayoutPolicy
            {
                Id = Guid.NewGuid(),
                PsychologistId = psychologist.Id,
            };
            context.TherapistPayoutPolicies.Add(policy);
        }

        policy.ReleasePolicy = dto.ReleasePolicy;
        policy.ReleaseDelayDays = dto.ReleasePolicy == PayoutReleasePolicy.ImmediateAfterConfirmation
            ? 0
            : dto.ReleaseDelayDays ?? 0;
        policy.PlatformFeeFixed = dto.PlatformFeeFixed;
        policy.PlatformFeePercent = dto.PlatformFeePercent;
        policy.FutureChargebackReservePercent = dto.FutureChargebackReservePercent;
        policy.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return Ok(policy);
    }

    [HttpPost("reconciliation")]
    public async Task<IActionResult> RunReconciliation([FromBody] RunReconciliationDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null)
            return NotFound("Psychologist profile not found.");

        if (dto.Transactions == null || dto.Transactions.Count == 0)
            return BadRequest("At least one Mercado Pago transaction is required.");

        var reconciled = await payoutFinanceService.RunReconciliationAsync(psychologist.Id, dto.Transactions);
        return Ok(reconciled);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null)
            return NotFound("Psychologist profile not found.");

        var ledger = await context.TherapistLedgerTransactions
            .Where(t => t.PsychologistId == psychologist.Id)
            .OrderByDescending(t => t.PaymentConfirmedAtUtc)
            .ToListAsync();

        var toRelease = ledger.Where(t => t.ReleaseStatus == LedgerReleaseStatus.ToRelease)
            .OrderBy(t => t.ExpectedReleaseAtUtc)
            .Select(t => new
            {
                t.Id,
                t.MercadoPagoTransactionId,
                t.GrossAmount,
                t.PlatformFeeAmount,
                t.NetAmount,
                t.ExpectedReleaseAtUtc,
                Status = t.ReleaseStatus.ToString().ToLowerInvariant()
            })
            .ToList();

        return Ok(new
        {
            GrossTotal = ledger.Sum(t => t.GrossAmount),
            PlatformFeeTotal = ledger.Sum(t => t.PlatformFeeAmount),
            NetTotal = ledger.Sum(t => t.NetAmount),
            ReleasedTotal = ledger.Where(t => t.ReleaseStatus == LedgerReleaseStatus.Released).Sum(t => t.NetAmount),
            BlockedForDisputeTotal = ledger.Where(t => t.ReleaseStatus == LedgerReleaseStatus.BlockedForDispute).Sum(t => t.NetAmount),
            ReversedTotal = ledger.Where(t => t.ReleaseStatus == LedgerReleaseStatus.Reversed).Sum(t => t.NetAmount),
            ForecastToRelease = toRelease
        });
    }
}
