namespace reframe.Models;

public class UpdateBillingPolicyDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MarkNoShowDto
{
    public string? Reason { get; set; }
}

public class ManualRefundDto
{
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class UpdatePayoutAccountDto
{
    public Guid PsychologistId { get; set; }
    public string GatewayAccountToken { get; set; } = string.Empty;
    public string? Last4 { get; set; }
}

public class UpdateTermsDto
{
    public string Version { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

public class SaveCardTokenDto
{
    public string CardNumber { get; set; } = string.Empty;
    public string HolderName { get; set; } = string.Empty;
    public int ExpMonth { get; set; }
    public int ExpYear { get; set; }
    public string? Brand { get; set; }
}
