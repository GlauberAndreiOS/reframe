using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

public class AutomaticThoughtSyncDto
{
    public Guid Id { get; set; }
    
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;
    
    [JsonPropertyName("situation")]
    public string Situation { get; set; } = string.Empty;
    
    [JsonPropertyName("thought")]
    public string Thought { get; set; } = string.Empty;
    
    [JsonPropertyName("emotion")]
    public string Emotion { get; set; } = string.Empty;
    
    [JsonPropertyName("behavior")]
    public string Behavior { get; set; } = string.Empty;
    
    [JsonPropertyName("evidencePro")]
    public string EvidencePro { get; set; } = string.Empty;
    
    [JsonPropertyName("evidenceContra")]
    public string EvidenceContra { get; set; } = string.Empty;
    
    [JsonPropertyName("alternativeThoughts")]
    public string AlternativeThoughts { get; set; } = string.Empty;
    
    [JsonPropertyName("reevaluation")]
    public string Reevaluation { get; set; } = string.Empty;
    
    [JsonPropertyName("deleted_at")]
    public string? DeletedAt { get; set; }
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
            .Where(at => at.PatientId == patient.Id && at.DeletedAt == null)
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
            .Where(at => at.PatientId == patientId && at.DeletedAt == null)
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
    
    [HttpDelete("{id}")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> DeleteThought(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null)
        {
            return NotFound("Patient profile not found.");
        }

        var thought = await _context.AutomaticThoughts.FindAsync(id);

        if (thought == null || thought.DeletedAt != null)
        {
            return NotFound("Thought not found.");
        }

        if (thought.PatientId != patient.Id)
        {
            return Forbid("You do not have permission to delete this thought.");
        }

        thought.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
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
        
        var existingThoughts = await _context.AutomaticThoughts
            .Where(at => receivedIds.Contains(at.Id))
            .ToListAsync();

        foreach (var existingThought in existingThoughts)
        {
            var dto = thoughtsDto.First(d => d.Id == existingThought.Id);
            
            if (!string.IsNullOrEmpty(dto.DeletedAt))
            {
                existingThought.DeletedAt = DateTime.Parse(dto.DeletedAt).ToUniversalTime();
            }
        }

        var existingIds = existingThoughts.Select(t => t.Id).ToList();
        var newThoughtsDto = thoughtsDto.Where(dto => !existingIds.Contains(dto.Id));

        var thoughtsToCreate = newThoughtsDto.Select(dto => new AutomaticThought
        {
            Id = dto.Id,
            Date = DateTime.Parse(dto.Date).ToUniversalTime(),
            Situation = dto.Situation,
            Thought = dto.Thought,
            Emotion = dto.Emotion,
            Behavior = dto.Behavior,
            EvidencePro = dto.EvidencePro,
            EvidenceContra = dto.EvidenceContra,
            AlternativeThoughts = dto.AlternativeThoughts,
            Reevaluation = dto.Reevaluation,
            PatientId = patient.Id,
            DeletedAt = !string.IsNullOrEmpty(dto.DeletedAt) ? DateTime.Parse(dto.DeletedAt).ToUniversalTime() : null
        });

        if (thoughtsToCreate.Any())
        {
            await _context.AutomaticThoughts.AddRangeAsync(thoughtsToCreate);
        }

        await _context.SaveChangesAsync();

        return Ok(new { SyncedCount = thoughtsToCreate.Count() + existingThoughts.Count });
    }
}