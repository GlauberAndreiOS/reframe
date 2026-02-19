using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public enum FinancialLedgerEventType
{
    SessionBooked,
    SessionCanceled,
    ChargeAuthorized,
    ChargeCaptured,
    ChargeFailed,
    RefundCreated,
    PackageDebited,
    PackageCredited,
    TherapistPayoutReleased
}

public enum FinancialDirection
{
    Debit,
    Credit
}

public enum FinancialLedgerSource
{
    App,
    Webhook,
    Admin
}

public class FinancialLedgerEvent
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;

    public Guid TherapistId { get; set; }
    public Psychologist Therapist { get; set; } = null!;

    public Guid? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public Guid? PackageId { get; set; }

    public long AmountCents { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "BRL";

    public FinancialDirection Direction { get; set; }

    public FinancialLedgerEventType EventType { get; set; }

    public DateTime OccurredAt { get; set; }

    public string MetadataJson { get; set; } = "{}";

    [MaxLength(128)]
    public string IdempotencyKey { get; set; } = string.Empty;

    public FinancialLedgerSource Source { get; set; }
}
