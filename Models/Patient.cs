using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class Patient
{
    [Key]
    public int Id { get; set; }




    public int UserId { get; set; }
    [ForeignKey("UserId")]
    [JsonIgnore]
    public User? User { get; set; }

    public int? PsychologistId { get; set; }
    [ForeignKey("PsychologistId")]

    public Psychologist? Psychologist { get; set; }

    public ICollection<AutomaticThought> AutomaticThoughts { get; set; } = new List<AutomaticThought>();
}
