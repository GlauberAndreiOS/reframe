using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

public class AutomaticThoughtSyncDto
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AutomaticThoughtController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AutomaticThoughtController(ApplicationDbContext context)
    {
        _context = context;
    }


    [HttpGet]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<IEnumerable<AutomaticThought>>> GetMyThoughts()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        return await _context.AutomaticThoughts
            .Where(at => at.PatientId == patient.Id)
            .OrderByDescending(at => at.Date)
            .ToListAsync();
    }


    [HttpGet("patient/{patientId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<AutomaticThought>>> GetPatientThoughts(Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await _context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);

        if (psychologist == null) return NotFound("Psychologist profile not found.");

        var patient = await _context.Patients.FindAsync(patientId);
        if (patient == null || patient.PsychologistId != psychologist.Id)
        {
            return Forbid("You do not have access to this patient's records.");
        }

        return await _context.AutomaticThoughts
            .Where(at => at.PatientId == patientId)
            .OrderByDescending(at => at.Date)
            .ToListAsync();
    }


    [HttpPost]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<AutomaticThought>> CreateThought(AutomaticThoughtDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        var thought = new AutomaticThought
        {
            Id = Guid.NewGuid(),
            Date = DateTime.UtcNow,
            Situation = dto.Situation,
            Thought = dto.Thought,
            Emotion = dto.Emotion,
            Behavior = dto.Behavior,
            EvidencePro = dto.EvidencePro,
            EvidenceContra = dto.EvidenceContra,
            AlternativeThoughts = dto.AlternativeThoughts,
            Reevaluation = dto.Reevaluation,
            PatientId = patient.Id
        };

        _context.AutomaticThoughts.Add(thought);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMyThoughts), new { id = thought.Id }, thought);
    }
    
    [HttpPost("sync")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> SyncThoughts([FromBody] List<AutomaticThoughtSyncDto> thoughtsDto)
    {
        if (thoughtsDto == null || !thoughtsDto.Any())
        {
            return Ok();
        }

        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        var receivedIds = thoughtsDto.Select(dto => dto.Id).ToList();
        
        var existingIds = await _context.AutomaticThoughts
            .Where(at => receivedIds.Contains(at.Id))
            .Select(at => at.Id)
            .ToListAsync();

        var newThoughtsDto = thoughtsDto.Where(dto => !existingIds.Contains(dto.Id));

        var thoughtsToCreate = newThoughtsDto.Select(dto => new AutomaticThought
        {
            Id = dto.Id,
            Date = DateTime.Parse(dto.CreatedAt).ToUniversalTime(),
            Thought = dto.Content,
            PatientId = patient.Id,
            Situation = "Entrada offline",
            Emotion = "Não especificada",
            Behavior = "",
            EvidencePro = "",
            EvidenceContra = "",
            AlternativeThoughts = "",
            Reevaluation = ""
        });

        if (thoughtsToCreate.Any())
        {
            await _context.AutomaticThoughts.AddRangeAsync(thoughtsToCreate);
            await _context.SaveChangesAsync();
        }

        return Ok(new { SyncedCount = thoughtsToCreate.Count() });
    }
}