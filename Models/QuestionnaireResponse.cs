using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace reframe.Models;

public class QuestionnaireResponse
{
    [Key] public Guid Id { get; set; }

    public Guid QuestionnaireId { get; set; }

    [ForeignKey("QuestionnaireId")] public Questionnaire? Questionnaire { get; set; }

    public Guid PatientId { get; set; }

    [ForeignKey("PatientId")] [JsonIgnore] public Patient? Patient { get; set; }


    public List<Answer> Answers { get; set; } = new();

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

public class Answer
{
    public string QuestionTitle { get; set; } = string.Empty;
    public object Value { get; set; } = new();
}