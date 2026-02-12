namespace reframe.Models;

public class UpdatePsychologistProfileDto
{
    public string? Name { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Street { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressComplement { get; set; }
    public string? Neighborhood { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }
    public string? Cpf { get; set; }
    public BiologicalSex? BiologicalSex { get; set; }
    public int? SessionDurationMinutes { get; set; }
    public string? BusinessPhone { get; set; }
    public string? Specialty { get; set; }
    public string? PresentationText { get; set; }
}
