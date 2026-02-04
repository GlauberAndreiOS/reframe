using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace reframe.Models;

public class QuestionnaireTemplate
{
    [Key] public Guid Id { get; set; }

    [Required] public string Title { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public string Category { get; set; } = string.Empty; // e.g., "TCC", "ABA", "General"

    public List<Question> Questions { get; set; } = new();
    
    public bool IsGlobal { get; set; } = false; // True for system templates, False for shared user templates

    public Guid? OriginalPsychologistId { get; set; } // Null for system templates

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
