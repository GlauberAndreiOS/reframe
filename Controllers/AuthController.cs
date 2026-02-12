using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using reframe.Data;
using reframe.Models;
using reframe.Services;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService)
    : ControllerBase
{
    private static DateTime? NormalizeToUtc(DateTime? value)
    {
        if (!value.HasValue) return null;
        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        try
        {
            return Regex.IsMatch(email,
                @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
                RegexOptions.IgnoreCase, TimeSpan.FromMilliseconds(250));
        }
        catch (RegexMatchTimeoutException)
        {
            return false;
        }
    }

    private static bool IsValidCpf(string? cpf)
    {
        if (string.IsNullOrWhiteSpace(cpf))
            return true;

        var digits = new string(cpf.Where(char.IsDigit).ToArray());
        return digits.Length == 11;
    }

    private static bool IsValidZipCode(string? zipCode)
    {
        if (string.IsNullOrWhiteSpace(zipCode))
            return true;

        var digits = new string(zipCode.Where(char.IsDigit).ToArray());
        return digits.Length == 8;
    }

    [HttpGet("check-username/{username}")]
    public async Task<IActionResult> CheckUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username)) return BadRequest("Username cannot be empty.");

        if (!IsValidEmail(username)) return BadRequest("Username must be a valid email.");

        var exists = await context.Users.AnyAsync(u => u.Username == username);
        return Ok(new { exists });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(UserDto request)
    {
        if (!IsValidEmail(request.Username)) return BadRequest("Username must be a valid email.");
        if (!IsValidCpf(request.Cpf)) return BadRequest("CPF must contain 11 digits.");
        if (!IsValidZipCode(request.ZipCode)) return BadRequest("ZipCode must contain 8 digits.");
        if (request.UserType == UserType.Psychologist && request.SessionDurationMinutes.HasValue &&
            request.SessionDurationMinutes.Value <= 0)
            return BadRequest("Session duration must be greater than zero.");

        if (await context.Users.AnyAsync(u => u.Username == request.Username))
            return BadRequest("User already exists.");

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            UserType = request.UserType,
            Name = request.Name ?? "",
            BirthDate = NormalizeToUtc(request.BirthDate),
            Street = request.Street,
            AddressNumber = request.AddressNumber,
            AddressComplement = request.AddressComplement,
            Neighborhood = request.Neighborhood,
            City = request.City,
            State = request.State,
            ZipCode = string.IsNullOrWhiteSpace(request.ZipCode)
                ? null
                : new string(request.ZipCode.Where(char.IsDigit).ToArray()),
            Cpf = string.IsNullOrWhiteSpace(request.Cpf) ? null : new string(request.Cpf.Where(char.IsDigit).ToArray()),
            BiologicalSex = request.BiologicalSex
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        if (request.UserType == UserType.Psychologist)
        {
            var fullCrp = $"{request.CrpNumber}/{request.CrpUf}";

            if (await context.Psychologists.AnyAsync(p => p.CRP == fullCrp))
            {
                context.Users.Remove(user);
                await context.SaveChangesAsync();
                return BadRequest("CRP already registered.");
            }

            var psychologist = new Psychologist
            {
                CRP = fullCrp,
                UserId = user.Id,
                SessionDurationMinutes = request.SessionDurationMinutes,
                BusinessPhone = request.BusinessPhone,
                Specialty = request.Specialty,
                PresentationText = request.PresentationText
            };
            context.Psychologists.Add(psychologist);
        }
        else if (request.UserType == UserType.Patient)
        {
            var patient = new Patient
            {
                UserId = user.Id,
                PsychologistId = request.PsychologistId
            };
            context.Patients.Add(patient);
        }

        await context.SaveChangesAsync();

        return Ok("User registered successfully.");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto request)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null) return BadRequest("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)) return BadRequest("Wrong password.");

        var token = CreateToken(user);

        return Ok(new { token, userType = (int)user.UserType });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto request)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Username == request.Email);
        if (user == null) return Ok("If the email exists, you will receive instructions.");

        user.ResetToken = CreateRandomToken();
        user.ResetTokenExpires = DateTime.UtcNow.AddDays(1);
        await context.SaveChangesAsync();

        try
        {
            await emailService.SendEmailAsync(user.Username, "Recuperação de Senha - Reframe",
                $"Seu token de recuperação é: {user.ResetToken}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error sending email: {ex.Message}");
        }

        return Ok("If the email exists, you will receive instructions.");
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto request)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.ResetToken == request.Token);
        if (user == null || user.ResetTokenExpires < DateTime.UtcNow) return BadRequest("Invalid Token.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        user.ResetToken = null;
        user.ResetTokenExpires = null;

        await context.SaveChangesAsync();

        return Ok("Password successfully reset.");
    }

    private string CreateRandomToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
    }

    private string CreateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.UserType.ToString()),
            new("UserId", user.Id.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration.GetSection("Jwt:Key").Value!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: creds
        );

        var jwt = new JwtSecurityTokenHandler().WriteToken(token);
        return jwt;
    }
}
