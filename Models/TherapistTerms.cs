using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class TherapistTerms
{
    [Key] public Guid Id { get; set; }

    public Guid TherapistId { get; set; }

    [ForeignKey("TherapistId")] [JsonIgnore] public Psychologist? Therapist { get; set; }

    public int Version { get; set; }

    public string Content { get; set; } = string.Empty;

    public DateTime EffectiveFrom { get; set; }

    public bool Active { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

