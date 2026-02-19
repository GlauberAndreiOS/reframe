using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public class AuditLog
{
    [Key] public Guid Id { get; set; }
    public Guid? ActorUserId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
