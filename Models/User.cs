using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public enum UserType
{
    Psychologist,
    Patient
}

public class User
{
    [Key]
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserType UserType { get; set; }
    
    // Novo campo para armazenar o nome real do usuário
    public string Name { get; set; } = string.Empty;
    
    public string? ResetToken { get; set; }
    public DateTime? ResetTokenExpires { get; set; }
    
    // Navigation properties
    public Psychologist? PsychologistProfile { get; set; }
    public Patient? PatientProfile { get; set; }
}
