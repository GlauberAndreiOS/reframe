using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public class PsychologistPayoutAccount
{
    [Key] public Guid Id { get; set; }
    public Guid PsychologistId { get; set; }
    public string GatewayAccountToken { get; set; } = string.Empty;
    public string? Last4 { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
