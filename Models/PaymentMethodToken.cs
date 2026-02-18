using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public class PaymentMethodToken
{
    [Key] public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string GatewayToken { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public string? Last4 { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
