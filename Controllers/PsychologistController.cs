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
public class PsychologistController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PsychologistController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Psychologist/profile
    // Retorna o perfil do psicólogo logado
    [HttpGet("profile")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
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

    // GET: api/Psychologist/patients
    // Retorna a lista de pacientes vinculados ao psicólogo logado
    [HttpGet("patients")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyPatients()
    {
        var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
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

    // GET: api/Psychologist/search?name=...
    // Permite buscar psicólogos (para pacientes se vincularem)
    [HttpGet("search")]
    [AllowAnonymous] 
    public async Task<ActionResult<IEnumerable<object>>> SearchPsychologists([FromQuery] string? name, [FromQuery] string? crp)
    {
        var query = _context.Psychologists.Include(p => p.User).AsQueryable();

        if (!string.IsNullOrEmpty(name))
        {
            query = query.Where(p => p.User.Name.Contains(name));
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
    
    // GET: api/Psychologist/all
    // Retorna todos os psicólogos (para listagem inicial no cadastro)
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
}