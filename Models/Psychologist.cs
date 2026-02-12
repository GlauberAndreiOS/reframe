using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class Psychologist
{
    [Key] public Guid Id { get; set; }

    [Required] public string CRP { get; set; } = string.Empty;

    public Guid UserId { get; set; }

    [ForeignKey("UserId")] [JsonIgnore] public User? User { get; set; }
    public int? SessionDurationMinutes { get; set; }
    public string? BusinessPhone { get; set; }
    public string? Specialty { get; set; }
    public string? PresentationText { get; set; }

    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
}
