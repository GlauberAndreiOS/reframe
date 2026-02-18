using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public enum AppointmentStatus
{
    Available = 0,
    Requested = 1,
    Confirmed = 2,
    Canceled = 3,
    FinancialPending = 4
}

public class Appointment
{
    [Key] public Guid Id { get; set; }

    public Guid PsychologistId { get; set; }

    [ForeignKey("PsychologistId")] [JsonIgnore] public Psychologist? Psychologist { get; set; }

    public Guid? PatientId { get; set; }

    [ForeignKey("PatientId")] [JsonIgnore] public Patient? Patient { get; set; }

    public DateTime Start { get; set; }

    public DateTime End { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Available;

    public string? Reason { get; set; }

    public DateTime? ChargeFailedAtUtc { get; set; }

    public DateTime? FinancialRegularizationDeadlineUtc { get; set; }

    public int ChargeRetryAttemptCount { get; set; }

    public DateTime? NextChargeRetryAtUtc { get; set; }

    public string? LastChargeFailureReason { get; set; }

    public string? PaymentProvider { get; set; }

    public string? PaymentMethodReference { get; set; }

    public string? PaymentMethodLastFourDigits { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
