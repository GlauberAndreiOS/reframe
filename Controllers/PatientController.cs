using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PatientController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PatientController> _logger;

    public PatientController(ApplicationDbContext context, ILogger<PatientController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // POST: api/Patient/link/{psychologistId}
    // Permite ao paciente se vincular a um psicólogo
    [HttpPost("link/{psychologistId}")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> LinkToPsychologist(int psychologistId)
    {
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null)
        {
            return NotFound("Patient profile not found.");
        }

        var psychologist = await _context.Psychologists.FindAsync(psychologistId);
        if (psychologist == null)
        {
            return NotFound("Psychologist not found.");
        }

        patient.PsychologistId = psychologistId;
        await _context.SaveChangesAsync();

        return Ok("Successfully linked to psychologist.");
    }

    // GET: api/Patient/profile
    // Retorna o perfil do paciente logado
    [HttpGet("profile")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value;
        _logger.LogInformation($"DEBUG: GetProfile called. UserId claim: {userIdClaim}");

        var userId = int.Parse(userIdClaim ?? "0");
        
        var patient = await _context.Patients
            .Include(p => p.User)
            .Include(p => p.Psychologist)
                .ThenInclude(psy => psy.User) // Include User for Psychologist to get Name
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null)
        {
            _logger.LogWarning($"DEBUG: Patient profile not found for UserId: {userId}");
            return NotFound();
        }

        _logger.LogInformation($"DEBUG: Patient found: {patient.User?.Name}, PsychologistId: {patient.PsychologistId}");

        return Ok(new 
        {
            patient.Id,
            Name = patient.User?.Name ?? string.Empty,
            Psychologist = patient.Psychologist != null ? new 
            {
                Name = patient.Psychologist.User?.Name ?? string.Empty,
                CRP = patient.Psychologist.CRP
            } : null
        });
    }
}