using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PsychologistController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PsychologistController(ApplicationDbContext context)
    {
        _context = context;
    }


    [HttpGet("profile")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await _context.Psychologists
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null)
        {
            return NotFound("Psychologist profile not found.");
        }

        return Ok(new 
        {
            psychologist.Id,
            Name = psychologist.User?.Name ?? string.Empty,
            psychologist.CRP,
            Email = psychologist.User?.Username ?? string.Empty
        });
    }


    [HttpGet("patients")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyPatients()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await _context.Psychologists
            .Include(p => p.Patients)
                .ThenInclude(pat => pat.User) // Include User for Patient to get Name
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null)
        {
            return NotFound("Psychologist profile not found.");
        }

        var result = psychologist.Patients.Select(p => new 
        {
            p.Id,
            Name = p.User?.Name ?? string.Empty
        });

        return Ok(result);
    }


    [HttpGet("search")]
    [AllowAnonymous] 
    public async Task<ActionResult<IEnumerable<object>>> SearchPsychologists([FromQuery] string? name, [FromQuery] string? crp)
    {
        var query = _context.Psychologists.Include(p => p.User).AsQueryable();

        if (!string.IsNullOrEmpty(name))
        {
            query = query.Where(p => p.User != null && p.User.Name.Contains(name));
        }

        if (!string.IsNullOrEmpty(crp))
        {
            query = query.Where(p => p.CRP.Contains(crp));
        }

        var result = await query.Select(p => new 
        {
            p.Id,
            Name = p.User != null ? p.User.Name : string.Empty,
            p.CRP,
            Email = p.User != null ? p.User.Username : string.Empty
        }).ToListAsync();

        return Ok(result);
    }


    [HttpGet("all")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetAllPsychologists()
    {
        var result = await _context.Psychologists
            .Include(p => p.User)
            .Select(p => new 
            {
                p.Id,
                Name = p.User != null ? p.User.Name : string.Empty,
                p.CRP,
                Email = p.User != null ? p.User.Username : string.Empty
            })
            .ToListAsync();

        return Ok(result);
    }

    // PUT: api/Psychologist/patient/{patientId}/unlink
    [HttpPut("patient/{patientId}/unlink")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> UnlinkPatient(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await _context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await _context.Patients.FindAsync(patientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PsychologistId != psychologist.Id)
        {
            return BadRequest("This patient is not linked to you.");
        }

        patient.PsychologistId = null;
        await _context.SaveChangesAsync();

        return Ok("Patient unlinked successfully.");
    }

    // PUT: api/Psychologist/patient/{patientId}/transfer/{targetPsychologistId}
    [HttpPut("patient/{patientId}/transfer/{targetPsychologistId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> TransferPatient(Guid patientId, Guid targetPsychologistId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var currentPsychologist = await _context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (currentPsychologist == null) return NotFound("Current psychologist profile not found.");

        var patient = await _context.Patients.FindAsync(patientId);
        if (patient == null) return NotFound("Patient not found.");

        if (patient.PsychologistId != currentPsychologist.Id)
        {
            return BadRequest("This patient is not linked to you.");
        }

        var targetPsychologist = await _context.Psychologists.FindAsync(targetPsychologistId);
        if (targetPsychologist == null) return NotFound("Target psychologist not found.");

        patient.PsychologistId = targetPsychologistId;
        await _context.SaveChangesAsync();

        return Ok("Patient transferred successfully.");
    }
}