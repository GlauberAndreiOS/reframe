using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public class TermsOfServiceVersion
{
    [Key] public Guid Id { get; set; }
    public string Version { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime EffectiveAt { get; set; } = DateTime.UtcNow;
    public Guid UpdatedByUserId { get; set; }
}
