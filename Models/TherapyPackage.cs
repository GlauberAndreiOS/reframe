using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public enum BillingCycle
{
    Monthly = 0,
    Biweekly = 1
}

public enum TherapyPackageStatus
{
    Active = 0,
    Paused = 1,
    Expired = 2,
    Canceled = 3
}

public enum RolloverPolicy
{
    NoRollover = 0,
    CarryUnusedToNextCycle = 1
}

public enum PausePolicy
{
    NoPause = 0,
    AllowPause = 1,
    AllowPauseWithExtension = 2
}

public enum SessionConsumptionPolicy
{
    OnBooking = 0,
    OnAttendanceConfirmation = 1,
    OnCompletion = 2
}

public class TherapyPackage
{
    [Key] public Guid Id { get; set; }

    public Guid PatientId { get; set; }

    [ForeignKey("PatientId")] [JsonIgnore] public Patient? Patient { get; set; }

    public int TotalSessions { get; set; }

    public int UsedSessions { get; set; }

    public BillingCycle BillingCycle { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public TherapyPackageStatus Status { get; set; } = TherapyPackageStatus.Active;

    public RolloverPolicy RolloverPolicy { get; set; } = RolloverPolicy.NoRollover;

    public PausePolicy PausePolicy { get; set; } = PausePolicy.NoPause;

    public SessionConsumptionPolicy SessionConsumptionPolicy { get; set; } = SessionConsumptionPolicy.OnAttendanceConfirmation;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

public class Holiday
{
    [Key] public Guid Id { get; set; }

    public Guid PsychologistId { get; set; }

    [ForeignKey("PsychologistId")] [JsonIgnore] public Psychologist? Psychologist { get; set; }

    public DateTime Date { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }
}
