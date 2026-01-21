namespace reframe.Models;

public class AutomaticThoughtDto
{
    public string Situation { get; set; } = string.Empty;
    public string Thought { get; set; } = string.Empty;
    public string Emotion { get; set; } = string.Empty;
    public string Behavior { get; set; } = string.Empty;
    public string EvidencePro { get; set; } = string.Empty;
    public string EvidenceContra { get; set; } = string.Empty;
    public string AlternativeThoughts { get; set; } = string.Empty;
    public string Reevaluation { get; set; } = string.Empty;
}