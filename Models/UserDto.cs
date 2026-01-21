namespace reframe.Models;

public class UserDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserType UserType { get; set; }
    
    // Campos opcionais dependendo do tipo
    public string? Name { get; set; }
    public string? Email { get; set; }
    
    // Campos específicos para Psicólogo
    public string? CrpNumber { get; set; } // Apenas o número
    public string? CrpUf { get; set; }     // Estado (ex: SP, RJ)
    
    // Campos específicos para Paciente
    public int? PsychologistId { get; set; }
}
