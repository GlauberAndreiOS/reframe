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
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        return await _context.AutomaticThoughts
            .Where(at => at.PatientId == patient.Id)
            .OrderByDescending(at => at.Date)
            .ToListAsync();
    }


    [HttpGet("patient/{patientId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<AutomaticThought>>> GetPatientThoughts(int patientId)
    {
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
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
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
        var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        var thought = new AutomaticThought
        {
            Date = DateTime.Now,
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
}