using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class AutomaticThought
{
    public Guid Id { get; set; }
    
    public DateTime Date { get; set; } = DateTime.Now;
    
    public string Situation { get; set; } = string.Empty;
    public string Thought { get; set; } = string.Empty;
    public string Emotion { get; set; } = string.Empty;
    public string Behavior { get; set; } = string.Empty;
    public string EvidencePro { get; set; } = string.Empty;
    public string EvidenceContra { get; set; } = string.Empty;
    public string AlternativeThoughts { get; set; } = string.Empty;
    public string Reevaluation { get; set; } = string.Empty;

    public int PatientId { get; set; }
    [ForeignKey("PatientId")]
    [JsonIgnore]
    public Patient? Patient { get; set; }
}