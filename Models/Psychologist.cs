using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class Psychologist
{
    [Key]
    public int Id { get; set; }
    
    // Name movido para User, mantido aqui temporariamente ou removido se preferir.
    // Vamos remover para evitar duplicação, já que a ideia é centralizar no User.
    // [Required]
    // public string Name { get; set; } = string.Empty;
    
    [Required]
    public string CRP { get; set; } = string.Empty;

    public int UserId { get; set; }
    [ForeignKey("UserId")]
    [JsonIgnore]
    public User? User { get; set; }

    public ICollection<Patient> Patients { get; set; } = new List<Patient>();
}
