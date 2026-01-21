using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class Patient
{
    [Key]
    public int Id { get; set; }
    
    // Name movido para User
    // [Required]
    // public string Name { get; set; } = string.Empty;

    public int UserId { get; set; }
    [ForeignKey("UserId")]
    [JsonIgnore]
    public User? User { get; set; }

    public int? PsychologistId { get; set; }
    [ForeignKey("PsychologistId")]
    // Removido JsonIgnore para permitir que o objeto Psychologist seja serializado na resposta da API
    public Psychologist? Psychologist { get; set; }

    public ICollection<AutomaticThought> AutomaticThoughts { get; set; } = new List<AutomaticThought>();
}
