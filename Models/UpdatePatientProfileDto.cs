namespace reframe.Models;

public class UpdatePatientProfileDto
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
}
