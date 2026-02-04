namespace reframe.Models;

public class CreateQuestionnaireDto
{
    public string Title { get; set; } = string.Empty;
    public List<QuestionDto> Questions { get; set; } = new();
    public bool IsShared { get; set; } = false;
    public Guid? TargetPatientId { get; set; }
}

public class QuestionDto
{
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public List<string>? Data { get; set; }
}

public class SubmitQuestionnaireResponseDto
{
    public Guid QuestionnaireId { get; set; }
    public List<AnswerDto> Answers { get; set; } = new();
}

public class AnswerDto
{
    public string QuestionTitle { get; set; } = string.Empty;
    public object Value { get; set; } = new();
}

public class QuestionnaireViewDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public Guid PsychologistId { get; set; }
    public Guid? TargetPatientId { get; set; }
    public string? TargetPatientName { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class QuestionnaireTemplateDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<QuestionDto> Questions { get; set; } = new();
    public bool IsGlobal { get; set; }
}

public class QuestionnaireApplicationDto
{
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public bool IsApplied { get; set; }
    public bool HasResponded { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public Guid? ResponseId { get; set; }
}
