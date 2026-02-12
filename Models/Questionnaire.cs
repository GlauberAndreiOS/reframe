using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class Questionnaire
{
    [Key] public Guid Id { get; set; }

    [Required] public string Title { get; set; } = string.Empty;

    public Guid PsychologistId { get; set; }

    [ForeignKey("PsychologistId")]
    [JsonIgnore]
    public Psychologist? Psychologist { get; set; }

    public Guid? TargetPatientId { get; set; }

    [ForeignKey("TargetPatientId")]
    [JsonIgnore]
    public Patient? TargetPatient { get; set; }
    
    // For patient-targeted questionnaires, points to the master questionnaire.
    public Guid? MasterQuestionnaireId { get; set; }

    public List<Question> Questions { get; set; } = new();
    
    public bool IsShared { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Question
{
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public List<string>? Data { get; set; }
}
