using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class Patient
{
    [Key] public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [ForeignKey("UserId")] [JsonIgnore] public User? User { get; set; }

    public Guid? PsychologistId { get; set; }

    [ForeignKey("PsychologistId")] public Psychologist? Psychologist { get; set; }

    public Guid? PendingPsychologistId { get; set; }

    [ForeignKey("PendingPsychologistId")] public Psychologist? PendingPsychologist { get; set; }

    public ICollection<AutomaticThought> AutomaticThoughts { get; set; } = new List<AutomaticThought>();
}
