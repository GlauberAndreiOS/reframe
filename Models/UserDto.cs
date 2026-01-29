namespace reframe.Models;

public class UserDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserType UserType { get; set; }

    public string? Name { get; set; }
    public string? Email { get; set; }

    public string? CrpNumber { get; set; } // Apenas o número
    public string? CrpUf { get; set; }     // Estado (ex: SP, RJ)

    public Guid? PsychologistId { get; set; }
}
