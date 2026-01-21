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
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public AuthController(ApplicationDbContext context, IConfiguration configuration, IEmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
    }

    private bool IsValidEmail(string email)
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

    [HttpGet("check-username/{username}")]
    public async Task<IActionResult> CheckUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest("Username cannot be empty.");
        }

        if (!IsValidEmail(username))
        {
            return BadRequest("Username must be a valid email.");
        }

        bool exists = await _context.Users.AnyAsync(u => u.Username == username);
        return Ok(new { exists });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(UserDto request)
    {
        if (!IsValidEmail(request.Username))
        {
            return BadRequest("Username must be a valid email.");
        }

        if (await _context.Users.AnyAsync(u => u.Username == request.Username))
        {
            return BadRequest("User already exists.");
        }

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            UserType = request.UserType,
            Name = request.Name ?? ""
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        if (request.UserType == UserType.Psychologist)
        {
            string fullCrp = $"{request.CrpNumber}/{request.CrpUf}"; 
            
            if (await _context.Psychologists.AnyAsync(p => p.CRP == fullCrp))
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                return BadRequest("CRP already registered.");
            }

            var psychologist = new Psychologist
            {
                CRP = fullCrp,
                UserId = user.Id
            };
            _context.Psychologists.Add(psychologist);
        }
        else if (request.UserType == UserType.Patient)
        {
            var patient = new Patient
            {
                UserId = user.Id,
                PsychologistId = request.PsychologistId
            };
            _context.Patients.Add(patient);
        }

        await _context.SaveChangesAsync();

        return Ok("User registered successfully.");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null)
        {
            return BadRequest("User not found.");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return BadRequest("Wrong password.");
        }

        string token = CreateToken(user);
        
        // Retorna o token e o tipo de usuário
        return Ok(new { token, userType = (int)user.UserType });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordDto request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Email);
        if (user == null)
        {
            return Ok("If the email exists, you will receive instructions.");
        }

        user.ResetToken = CreateRandomToken();
        user.ResetTokenExpires = DateTime.Now.AddDays(1);
        await _context.SaveChangesAsync();

        try 
        {
            await _emailService.SendEmailAsync(user.Username, "Recuperação de Senha - Reframe", 
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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.ResetToken == request.Token);
        if (user == null || user.ResetTokenExpires < DateTime.Now)
        {
            return BadRequest("Invalid Token.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        user.ResetToken = null;
        user.ResetTokenExpires = null;

        await _context.SaveChangesAsync();

        return Ok("Password successfully reset.");
    }

    private string CreateRandomToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
    }

    private string CreateToken(User user)
    {
        List<Claim> claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.UserType.ToString()),
            new Claim("UserId", user.Id.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration.GetSection("Jwt:Key").Value!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.Now.AddDays(1),
            signingCredentials: creds
        );

        var jwt = new JwtSecurityTokenHandler().WriteToken(token);
        return jwt;
    }
}
