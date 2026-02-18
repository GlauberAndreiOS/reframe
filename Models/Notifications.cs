using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace reframe.Models;

public enum NotificationTemplate
{
    SessionCreated = 0,
    SessionRescheduled = 1,
    CancellationWindowClosing = 2,
    ChargeSucceeded = 3,
    ChargeFailed = 4,
    SessionNoShow = 5,
    RefundIssued = 6,
    PayoutCompleted = 7
}

public enum NotificationChannel
{
    Email = 0,
    Push = 1,
    Sms = 2,
    WhatsApp = 3
}

public enum NotificationDeliveryStatus
{
    Pending = 0,
    Sent = 1,
    Failed = 2
}

public class NotificationLog
{
    [Key] public Guid Id { get; set; }

    public Guid? AppointmentId { get; set; }

    [ForeignKey(nameof(AppointmentId))]
    public Appointment? Appointment { get; set; }

    [MaxLength(120)] public string Template { get; set; } = string.Empty;

    public NotificationChannel Channel { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public NotificationDeliveryStatus DeliveryStatus { get; set; } = NotificationDeliveryStatus.Sent;
}
