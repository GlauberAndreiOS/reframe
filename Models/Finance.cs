using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public enum PayoutMethod
{
    Pix = 1,
    BankTransfer = 2
}

public enum PayoutReleasePolicy
{
    ImmediateAfterConfirmation = 1,
    DPlusN = 2
}

public enum LedgerReleaseStatus
{
    ToRelease = 1,
    Released = 2,
    BlockedForDispute = 3,
    Reversed = 4
}

public class TherapistPayoutAccount
{
    [Key] public Guid Id { get; set; }

    public Guid PsychologistId { get; set; }

    [ForeignKey(nameof(PsychologistId))]
    [JsonIgnore]
    public Psychologist? Psychologist { get; set; }

    [Required] public PayoutMethod Method { get; set; }

    public string? PixKeyType { get; set; }
    public string? PixKey { get; set; }

    public string? BankCode { get; set; }
    public string? BankBranch { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountDigit { get; set; }

    [Required] public string HolderName { get; set; } = string.Empty;
    [Required] public string HolderDocument { get; set; } = string.Empty;

    public bool IsHolderValidated { get; set; }
    public string? HolderValidationMessage { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class TherapistPayoutPolicy
{
    [Key] public Guid Id { get; set; }

    public Guid PsychologistId { get; set; }

    [ForeignKey(nameof(PsychologistId))]
    [JsonIgnore]
    public Psychologist? Psychologist { get; set; }

    [Required] public PayoutReleasePolicy ReleasePolicy { get; set; } = PayoutReleasePolicy.DPlusN;
    public int ReleaseDelayDays { get; set; } = 7;

    [Column(TypeName = "numeric(18,2)")]
    public decimal PlatformFeeFixed { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal PlatformFeePercent { get; set; }

    [Column(TypeName = "numeric(5,2)")]
    public decimal FutureChargebackReservePercent { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class TherapistLedgerTransaction
{
    [Key] public Guid Id { get; set; }

    public Guid PsychologistId { get; set; }

    [ForeignKey(nameof(PsychologistId))]
    [JsonIgnore]
    public Psychologist? Psychologist { get; set; }

    [Required] public string MercadoPagoTransactionId { get; set; } = string.Empty;
    public string? MercadoPagoStatus { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal GrossAmount { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal PlatformFeeAmount { get; set; }

    [Column(TypeName = "numeric(18,2)")]
    public decimal NetAmount { get; set; }

    [Required] public LedgerReleaseStatus ReleaseStatus { get; set; } = LedgerReleaseStatus.ToRelease;

    public DateTime PaymentConfirmedAtUtc { get; set; }
    public DateTime ExpectedReleaseAtUtc { get; set; }
    public DateTime? ReleasedAtUtc { get; set; }
    public DateTime? ReversedAtUtc { get; set; }
    public DateTime? BlockedAtUtc { get; set; }
    public DateTime? LastReconciledAtUtc { get; set; }

    public string? ReconciliationNotes { get; set; }
}

public record UpsertTherapistPayoutAccountDto(
    PayoutMethod Method,
    string? PixKeyType,
    string? PixKey,
    string? BankCode,
    string? BankBranch,
    string? BankAccountNumber,
    string? BankAccountDigit,
    string HolderName,
    string HolderDocument
);

public record UpsertTherapistPayoutPolicyDto(
    PayoutReleasePolicy ReleasePolicy,
    int? ReleaseDelayDays,
    decimal PlatformFeeFixed,
    decimal PlatformFeePercent,
    decimal FutureChargebackReservePercent
);

public record MercadoPagoReconciliationItemDto(
    string MercadoPagoTransactionId,
    string MercadoPagoStatus,
    decimal GrossAmount,
    DateTime PaymentConfirmedAtUtc,
    bool IsDisputeOpen,
    bool IsChargeback
);

public record RunReconciliationDto(IReadOnlyList<MercadoPagoReconciliationItemDto> Transactions);
