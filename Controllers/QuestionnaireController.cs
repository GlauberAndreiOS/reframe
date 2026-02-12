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
public class QuestionnaireController(ApplicationDbContext context) : ControllerBase
{
    private static List<Question> CloneQuestions(IEnumerable<Question> source)
    {
        return source.Select(q => new Question
        {
            Title = q.Title,
            Type = q.Type,
            Data = q.Data != null ? new List<string>(q.Data) : null
        }).ToList();
    }

    [HttpPost]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<Questionnaire>> CreateQuestionnaire(CreateQuestionnaireDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

        var psychologist = await context.Psychologists
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");
        
        var masterQuestionnaire = new Questionnaire
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            PsychologistId = psychologist.Id,
            TargetPatientId = null,
            MasterQuestionnaireId = null,
            Questions = dto.Questions.Select(q => new Question
            {
                Title = q.Title,
                Type = q.Type,
                Data = q.Data
            }).ToList(),
            IsShared = dto.IsShared,
            CreatedAt = DateTime.UtcNow
        };

        context.Questionnaires.Add(masterQuestionnaire);
        
        if (masterQuestionnaire.IsShared)
        {
            var template = new QuestionnaireTemplate
            {
                Id = Guid.NewGuid(),
                Title = masterQuestionnaire.Title,
                Description = "Shared by a user.",
                Category = "User Shared",
                Questions = CloneQuestions(masterQuestionnaire.Questions),
                IsGlobal = false,
                OriginalPsychologistId = psychologist.Id,
                CreatedAt = DateTime.UtcNow
            };
            context.QuestionnaireTemplates.Add(template);
        }
        
        if (dto.TargetPatientIds != null && dto.TargetPatientIds.Any())
        {
            foreach (var patientId in dto.TargetPatientIds)
            {
                var isPatientLinked = await context.Patients.AnyAsync(p => p.Id == patientId && p.PsychologistId == psychologist.Id);
                if (!isPatientLinked) continue; 

                var patientQuestionnaire = new Questionnaire
                {
                    Id = Guid.NewGuid(),
                    Title = masterQuestionnaire.Title,
                    PsychologistId = psychologist.Id,
                    TargetPatientId = patientId,
                    MasterQuestionnaireId = masterQuestionnaire.Id,
                    Questions = CloneQuestions(masterQuestionnaire.Questions),
                    IsShared = false,
                    CreatedAt = DateTime.UtcNow
                };

                context.Questionnaires.Add(patientQuestionnaire);
            }
        }
        
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuestionnaire), new { id = masterQuestionnaire.Id }, masterQuestionnaire);
    }
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuestionnaireViewDto>>> GetQuestionnaires()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

        var userRole = User.FindFirstValue(ClaimTypes.Role);

        switch (userRole)
        {
            case "Psychologist":
            {
                var psychologist = await context.Psychologists
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.UserId == userId);
                if (psychologist == null) return BadRequest("Psychologist profile not found.");

                var questionnaires = await context.Questionnaires
                    .Include(q => q.TargetPatient)
                    .ThenInclude(p => p.User)
                    .Where(q => q.PsychologistId == psychologist.Id && q.TargetPatientId == null)
                    .OrderByDescending(q => q.CreatedAt)
                    .ToListAsync();

                var result = questionnaires.Select(q => new QuestionnaireViewDto
                {
                    Id = q.Id,
                    Title = q.Title,
                    PsychologistId = q.PsychologistId,
                    TargetPatientId = q.TargetPatientId,
                    TargetPatientName = q.TargetPatient?.User?.Name,
                    Questions = q.Questions.Select(qu => new QuestionDto
                    {
                        Title = qu.Title,
                        Type = qu.Type,
                        Data = qu.Data
                    }).ToList(),
                    CreatedAt = q.CreatedAt
                }).ToList();

                return Ok(result);
            }
            case "Patient":
            {
                var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
                if (patient == null) return BadRequest("Patient profile not found.");

                if (patient.PsychologistId == null) return Ok(new List<QuestionnaireViewDto>());

                var questionnaires = await context.Questionnaires
                    .Where(q => q.PsychologistId == patient.PsychologistId && q.TargetPatientId == patient.Id)
                    .Where(q =>
                        q.MasterQuestionnaireId != null
                            ? context.Questionnaires.Any(master =>
                                master.Id == q.MasterQuestionnaireId &&
                                master.PsychologistId == q.PsychologistId &&
                                master.TargetPatientId == null)
                            : context.Questionnaires.Any(master =>
                                master.PsychologistId == q.PsychologistId &&
                                master.TargetPatientId == null &&
                                master.Title == q.Title))
                    .OrderByDescending(q => q.CreatedAt)
                    .ToListAsync();

                var result = questionnaires.Select(q => new QuestionnaireViewDto
                {
                    Id = q.Id,
                    Title = q.Title,
                    PsychologistId = q.PsychologistId,
                    TargetPatientId = q.TargetPatientId,
                    Questions = q.Questions.Select(qu => new QuestionDto
                    {
                        Title = qu.Title,
                        Type = qu.Type,
                        Data = qu.Data
                    }).ToList(),
                    CreatedAt = q.CreatedAt
                }).ToList();

                return Ok(result);
            }
            default:
                return Ok(new List<QuestionnaireViewDto>());
        }
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<QuestionnaireViewDto>> GetQuestionnaire(Guid id)
    {
        var questionnaire = await context.Questionnaires
            .Include(q => q.TargetPatient)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (questionnaire == null) return NotFound();


        return new QuestionnaireViewDto
        {
            Id = questionnaire.Id,
            Title = questionnaire.Title,
            PsychologistId = questionnaire.PsychologistId,
            TargetPatientId = questionnaire.TargetPatientId,
            TargetPatientName = questionnaire.TargetPatient?.User?.Name,
            Questions = questionnaire.Questions.Select(q => new QuestionDto
            {
                Title = q.Title,
                Type = q.Type,
                Data = q.Data
            }).ToList(),
            CreatedAt = questionnaire.CreatedAt
        };
    }
    
    [HttpPut("{id}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> UpdateQuestionnaire(Guid id, CreateQuestionnaireDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var questionnaire = await context.Questionnaires.FindAsync(id);
        if (questionnaire == null) return NotFound();

        if (questionnaire.PsychologistId != psychologist.Id) return Forbid();

        questionnaire.Title = dto.Title;
        questionnaire.TargetPatientId = dto.TargetPatientId;
        questionnaire.Questions = dto.Questions.Select(q => new Question
        {
            Title = q.Title,
            Type = q.Type,
            Data = q.Data
        }).ToList();
        questionnaire.IsShared = dto.IsShared;

        context.Entry(questionnaire).State = EntityState.Modified;
        
        var existingTemplate = await context.QuestionnaireTemplates.FirstOrDefaultAsync(t => t.OriginalPsychologistId == psychologist.Id && t.Title == questionnaire.Title);
        if (questionnaire.IsShared)
        {
            if (existingTemplate != null)
            {
                existingTemplate.Questions = CloneQuestions(questionnaire.Questions);
                context.Entry(existingTemplate).State = EntityState.Modified;
            }
            else
            {
                var template = new QuestionnaireTemplate
                {
                    Id = Guid.NewGuid(),
                    Title = questionnaire.Title,
                    Description = "Shared by a user.",
                    Category = "User Shared",
                    Questions = CloneQuestions(questionnaire.Questions),
                    IsGlobal = false,
                    OriginalPsychologistId = psychologist.Id,
                    CreatedAt = DateTime.UtcNow
                };
                context.QuestionnaireTemplates.Add(template);
            }
        }
        else
        {
            if (existingTemplate != null)
            {
                context.QuestionnaireTemplates.Remove(existingTemplate);
            }
        }

        await context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> DeleteQuestionnaire(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var questionnaire = await context.Questionnaires.FindAsync(id);
        if (questionnaire == null) return NotFound();

        if (questionnaire.PsychologistId != psychologist.Id) return Forbid();

        context.Questionnaires.Remove(questionnaire);
        
        var existingTemplate = await context.QuestionnaireTemplates.FirstOrDefaultAsync(t => t.OriginalPsychologistId == psychologist.Id && t.Title == questionnaire.Title);
        if (existingTemplate != null)
        {
            context.QuestionnaireTemplates.Remove(existingTemplate);
        }
        
        await context.SaveChangesAsync();

        return NoContent();
    }
    
    [HttpPost("Response")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<QuestionnaireResponse>> SubmitResponse(SubmitQuestionnaireResponseDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null) return BadRequest("Patient profile not found.");

        var questionnaire = await context.Questionnaires.FindAsync(dto.QuestionnaireId);
        if (questionnaire == null) return NotFound("Questionnaire not found.");

        if (patient.PsychologistId != questionnaire.PsychologistId)
            return Forbid("You can only answer questionnaires from your psychologist.");
            
        if (questionnaire.TargetPatientId != null && questionnaire.TargetPatientId != patient.Id)
            return Forbid("This questionnaire is not assigned to you.");

        var response = new QuestionnaireResponse
        {
            Id = Guid.NewGuid(),
            QuestionnaireId = dto.QuestionnaireId,
            PatientId = patient.Id,
            Answers = dto.Answers.Select(a => new Answer
            {
                QuestionTitle = a.QuestionTitle,
                Value = a.Value
            }).ToList(),
            SubmittedAt = DateTime.UtcNow
        };

        context.QuestionnaireResponses.Add(response);
        await context.SaveChangesAsync();

        return Ok(response);
    }
    
    [HttpGet("Responses/{questionnaireId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<QuestionnaireResponse>>> GetResponses(Guid questionnaireId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());

        var psychologist = await context.Psychologists
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var questionnaire = await context.Questionnaires.FindAsync(questionnaireId);
        if (questionnaire == null) return NotFound();

        if (questionnaire.PsychologistId != psychologist.Id) return Forbid();

        var responses = await context.QuestionnaireResponses
            .Include(r => r.Patient)
            .ThenInclude(p => p.User)
            .Where(r => r.QuestionnaireId == questionnaireId)
            .OrderByDescending(r => r.SubmittedAt)
            .ToListAsync();

        return Ok(responses);
    }
    
    [HttpGet("Response/{responseId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<object>> GetResponse(Guid responseId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var response = await context.QuestionnaireResponses
            .Include(r => r.Questionnaire)
            .Include(r => r.Patient)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(r => r.Id == responseId);

        if (response == null) return NotFound();
        if (response.Questionnaire == null) return NotFound("Questionnaire not found.");

        if (response.Questionnaire.PsychologistId != psychologist.Id) return Forbid();

        return Ok(new
        {
            response.Id,
            response.SubmittedAt,
            Questionnaire = new
            {
                response.Questionnaire.Id,
                response.Questionnaire.Title,
                response.Questionnaire.Questions
            },
            response.Answers,
            Patient = new
            {
                response.PatientId,
                Name = response.Patient?.User?.Name,
                ProfilePictureUrl = response.Patient?.User?.ProfilePictureUrl
            }
        });
    }
    
    [HttpGet("Templates")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<QuestionnaireTemplateDto>>> GetTemplates()
    {
        var templates = await context.QuestionnaireTemplates
            .OrderBy(t => t.Category)
            .ThenBy(t => t.Title)
            .ToListAsync();

        var result = templates.Select(t => new QuestionnaireTemplateDto
        {
            Id = t.Id,
            Title = t.Title,
            Description = t.Description,
            Category = t.Category,
            Questions = t.Questions.Select(q => new QuestionDto
            {
                Title = q.Title,
                Type = q.Type,
                Data = q.Data
            }).ToList(),
            IsGlobal = t.IsGlobal
        }).ToList();

        return Ok(result);
    }

    [HttpPost("CopyTemplate/{templateId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<Questionnaire>> CopyTemplate(Guid templateId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var template = await context.QuestionnaireTemplates.FindAsync(templateId);
        if (template == null) return NotFound("Template not found.");

        var questionnaire = new Questionnaire
        {
            Id = Guid.NewGuid(),
            Title = template.Title,
            PsychologistId = psychologist.Id,
            MasterQuestionnaireId = null,
            Questions = CloneQuestions(template.Questions),
            IsShared = false,
            CreatedAt = DateTime.UtcNow
        };

        context.Questionnaires.Add(questionnaire);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuestionnaire), new { id = questionnaire.Id }, questionnaire);
    }

    [HttpGet("Applications/{questionnaireId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<ActionResult<IEnumerable<QuestionnaireApplicationDto>>> GetApplications(Guid questionnaireId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists
            .Include(p => p.Patients)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);
        
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var questionnaire = await context.Questionnaires.FindAsync(questionnaireId);
        if (questionnaire == null) return NotFound();
        if (questionnaire.PsychologistId != psychologist.Id) return Forbid();

        var assignedQuestionnaires = await context.Questionnaires
            .Where(q => q.PsychologistId == psychologist.Id &&
                        q.TargetPatientId != null &&
                        q.MasterQuestionnaireId == questionnaire.Id)
            .ToListAsync();

        var applications = new List<QuestionnaireApplicationDto>();
        
        foreach (var patient in psychologist.Patients)
        {
            var assignedQ = assignedQuestionnaires.FirstOrDefault(q => q.TargetPatientId == patient.Id);
            
            bool isApplied = assignedQ != null;
            bool hasResponded = false;
            DateTime? submittedAt = null;
            Guid? responseId = null;

            if (isApplied)
            {
                var response = await context.QuestionnaireResponses
                    .Where(r => r.QuestionnaireId == assignedQ!.Id)
                    .OrderByDescending(r => r.SubmittedAt)
                    .FirstOrDefaultAsync();
                
                if (response != null)
                {
                    hasResponded = true;
                    submittedAt = response.SubmittedAt;
                    responseId = response.Id;
                }
            }

            applications.Add(new QuestionnaireApplicationDto
            {
                PatientId = patient.Id,
                PatientName = patient.User?.Name ?? "Unknown",
                IsApplied = isApplied,
                HasResponded = hasResponded,
                SubmittedAt = submittedAt,
                ResponseId = responseId
            });
        }

        return Ok(applications);
    }

    [HttpPost("Apply/{questionnaireId}/{patientId}")]
    [Authorize(Roles = "Psychologist")]
    public async Task<IActionResult> ApplyQuestionnaire(Guid questionnaireId, Guid patientId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var psychologist = await context.Psychologists.FirstOrDefaultAsync(p => p.UserId == userId);
        if (psychologist == null) return BadRequest("Psychologist profile not found.");

        var masterQuestionnaire = await context.Questionnaires.FindAsync(questionnaireId);
        if (masterQuestionnaire == null) return NotFound();
        if (masterQuestionnaire.PsychologistId != psychologist.Id) return Forbid();

        var existing = await context.Questionnaires
            .FirstOrDefaultAsync(q => q.PsychologistId == psychologist.Id &&
                                      q.TargetPatientId == patientId &&
                                      q.MasterQuestionnaireId == masterQuestionnaire.Id);
            
        if (existing != null) return BadRequest("Questionnaire already applied to this patient.");

        var newQuestionnaire = new Questionnaire
        {
            Id = Guid.NewGuid(),
            Title = masterQuestionnaire.Title,
            PsychologistId = psychologist.Id,
            TargetPatientId = patientId,
            MasterQuestionnaireId = masterQuestionnaire.Id,
            Questions = CloneQuestions(masterQuestionnaire.Questions),
            IsShared = false,
            CreatedAt = DateTime.UtcNow
        };
        
        context.Questionnaires.Add(newQuestionnaire);
        await context.SaveChangesAsync();

        return Ok(newQuestionnaire);
    }
}
