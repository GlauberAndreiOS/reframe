namespace reframe.Models;

public class PatientDocument
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = "custom";
    public string? DisplayName { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = "application/octet-stream";
    public string Extension { get; set; } = string.Empty;
    public string RelativePath { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? UploadedByUserId { get; set; }
    public PatientDocumentCsvSummary? CsvSummary { get; set; }
}

public class PatientDocumentCsvSummary
{
    public int Rows { get; set; }
    public List<string> Columns { get; set; } = [];
}
