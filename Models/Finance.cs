using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace reframe.Models;

public enum ReceiptStatus
{
    Charged = 0,
    ChargeFailed = 1,
    Refunded = 2,
    PayoutCompleted = 3
}

public class SessionReceipt
{
    [Key] public Guid Id { get; set; }

    public Guid AppointmentId { get; set; }

    [ForeignKey(nameof(AppointmentId))]
    public Appointment? Appointment { get; set; }

    public Guid? PatientId { get; set; }

    public Guid PsychologistId { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Amount { get; set; }

    [MaxLength(8)] public string Currency { get; set; } = "BRL";

    public ReceiptStatus Status { get; set; } = ReceiptStatus.Charged;

    [MaxLength(400)] public string Description { get; set; } = string.Empty;

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
}

public class FinanceEventDto
{
    public Guid AppointmentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BRL";
    public string Description { get; set; } = string.Empty;
}

public class SessionReceiptDto
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public DateTime SessionStart { get; set; }
    public DateTime SessionEnd { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BRL";
    public ReceiptStatus Status { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public List<NotificationLogDto> NotificationHistory { get; set; } = new();
}

public class NotificationLogDto
{
    public string Template { get; set; } = string.Empty;
    public NotificationChannel Channel { get; set; }
    public DateTime SentAt { get; set; }
    public NotificationDeliveryStatus DeliveryStatus { get; set; }
}
