using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public enum PaymentStatus
{
    Pending = 0,
    Authorized = 1,
    Captured = 2,
    Failed = 3,
    Refunded = 4,
    Chargeback = 5
}

public enum SessionStatus
{
    Scheduled = 0,
    Completed = 1,
    CanceledByPatient = 2,
    CanceledByTherapist = 3,
    NoShowPatient = 4,
    NoShowTherapist = 5
}

public enum ChargeDecision
{
    Charge = 0,
    ConsumePackage = 1,
    DoNotCharge = 2
}

public enum ChargeTiming
{
    BeforeSession = 0,
    AfterSession = 1
}

public class PsychologistBillingPolicy
{
    public ChargeTiming ChargeTiming { get; set; } = ChargeTiming.AfterSession;

    [Range(0, 720)]
    public int FreeCancellationWindowHours { get; set; } = 24;
}

public class SessionPackageContext
{
    public bool HasActivePackage { get; set; }
    public int RemainingSessions { get; set; }
}

public class SessionBillingInput
{
    public DateTime SessionStartUtc { get; set; }
    public DateTime DecisionAtUtc { get; set; } = DateTime.UtcNow;
    public SessionStatus SessionStatus { get; set; }
    public PsychologistBillingPolicy Policy { get; set; } = new();
    public SessionPackageContext Package { get; set; } = new();
}

public class SessionBillingResult
{
    public ChargeDecision Decision { get; set; }

    [Required]
    public string DecisionReason { get; set; } = string.Empty;
}
