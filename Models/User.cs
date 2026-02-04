using System.ComponentModel.DataAnnotations;

namespace reframe.Models;

public enum UserType
{
    Psychologist,
    Patient
}

public class User
{
    [Key] public Guid Id { get; set; }

    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserType UserType { get; set; }

    public string Name { get; set; } = string.Empty;
    
    public string? ProfilePictureUrl { get; set; }

    public string? ResetToken { get; set; }
    public DateTime? ResetTokenExpires { get; set; }

    public Psychologist? PsychologistProfile { get; set; }
    public Patient? PatientProfile { get; set; }
}