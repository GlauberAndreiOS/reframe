namespace reframe.Models;

public class UserDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public UserType UserType { get; set; }

    public string? Name { get; set; }
    public string? Email { get; set; }

    public string? CrpNumber { get; set; }
    public string? CrpUf { get; set; }

    public Guid? PsychologistId { get; set; }
}