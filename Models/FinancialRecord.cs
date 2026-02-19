using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public class FinancialRecord
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public DateTime LegalRetentionUntil { get; set; }
}
