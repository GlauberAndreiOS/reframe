using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using reframe.Data;
using reframe.Models;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PatientController(ApplicationDbContext context, ILogger<PatientController> logger, IWebHostEnvironment env)
    : ControllerBase
{
    private const long MaxFileSizeBytes = 15 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = [".pdf", ".csv", ".txt", ".doc", ".docx"];

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

    private static char ResolveCsvDelimiter(string headerLine)
    {
        var semicolonCount = headerLine.Count(c => c == ';');
        var commaCount = headerLine.Count(c => c == ',');
        return semicolonCount > commaCount ? ';' : ',';
    }

    private static List<string> ParseCsvLine(string line, char delimiter)
    {
        var values = new List<string>();
        var sb = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var current = line[i];

            if (current == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    sb.Append('"');
                    i++;
                    continue;
                }

                inQuotes = !inQuotes;
                continue;
            }

            if (current == delimiter && !inQuotes)
            {
                values.Add(sb.ToString().Trim());
                sb.Clear();
                continue;
            }

            sb.Append(current);
        }

        values.Add(sb.ToString().Trim());
        return values;
    }

    private static string SanitizeFileName(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "document";
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(input.Where(c => !invalidChars.Contains(c)).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(sanitized) ? "document" : sanitized;
    }

    private static string EnsureKind(string? kind)
    {
        var cleaned = (kind ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(cleaned)) return "custom";
        return cleaned.Length > 50 ? cleaned[..50] : cleaned;
    }

    private static string? EnsureDisplayName(string? displayName)
    {
        var cleaned = displayName?.Trim();
        if (string.IsNullOrWhiteSpace(cleaned)) return null;
        return cleaned.Length > 120 ? cleaned[..120] : cleaned;
    }

    private static string BuildStoredFileName(string baseName, string extension)
    {
        var safeBase = SanitizeFileName(baseName);
        return $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}_{safeBase}{extension}";
    }

    private static PatientDocumentCsvSummary BuildCsvSummary(List<string> lines)
    {
        var delimiter = ResolveCsvDelimiter(lines[0]);
        var headers = ParseCsvLine(lines[0], delimiter);
        var rows = Math.Max(0, lines.Count - 1);

        return new PatientDocumentCsvSummary
        {
            Rows = rows,
            Columns = headers
        };
    }


    [HttpPost("link/{psychologistId}")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> LinkToPsychologist(Guid psychologistId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        var psychologist = await context.Psychologists.FindAsync(psychologistId);
        if (psychologist == null) return NotFound("Psychologist not found.");

        patient.PendingPsychologistId = psychologistId;
        await context.SaveChangesAsync();

        return Ok("Link request sent successfully.");
    }


    [HttpPut("psychologist")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UpdatePsychologistLink([FromBody] UpdatePsychologistDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        if (!dto.PsychologistId.HasValue)
        {
            patient.PsychologistId = null;
            patient.PendingPsychologistId = null;
            await context.SaveChangesAsync();

            return Ok("Psychologist link removed.");
        }

        var psychologist = await context.Psychologists.FindAsync(dto.PsychologistId.Value);
        if (psychologist == null) return NotFound("Psychologist not found.");

        if (patient.PsychologistId == dto.PsychologistId.Value)
        {
            patient.PendingPsychologistId = null;
            await context.SaveChangesAsync();
            return Ok("Patient is already linked to this psychologist.");
        }

        patient.PendingPsychologistId = dto.PsychologistId;
        await context.SaveChangesAsync();

        return Ok("Link request sent successfully.");
    }


    [HttpGet("profile")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var userIdClaim = User.FindFirst("UserId")?.Value;
        logger.LogInformation($"DEBUG: GetProfile called. UserId claim: {userIdClaim}");

        var userId = Guid.Parse(userIdClaim ?? Guid.Empty.ToString());

        var patient = await context.Patients
            .Include(p => p.User)
            .Include(p => p.Psychologist)
            .ThenInclude(psy => psy!.User)
            .Include(p => p.PendingPsychologist)
            .ThenInclude(psy => psy!.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null)
        {
            logger.LogWarning($"DEBUG: Patient profile not found for UserId: {userId}");
            return NotFound();
        }

        logger.LogInformation($"DEBUG: Patient found: {patient.User?.Name}, PsychologistId: {patient.PsychologistId}");

        return Ok(new
        {
            patient.Id,
            Name = patient.User?.Name ?? string.Empty,
            ProfilePictureUrl = patient.User?.ProfilePictureUrl,
            patient.User?.BirthDate,
            patient.User?.Street,
            patient.User?.AddressNumber,
            patient.User?.AddressComplement,
            patient.User?.Neighborhood,
            patient.User?.City,
            patient.User?.State,
            patient.User?.ZipCode,
            patient.User?.Cpf,
            patient.User?.BiologicalSex,
            Documents = (patient.Documents ?? [])
                .OrderByDescending(d => d.UploadedAtUtc)
                .ToList(),
            HasPendingLinkRequest = patient.PendingPsychologistId != null,
            Psychologist = patient.Psychologist != null
                ? new
                {
                    patient.Psychologist.Id,
                    Name = patient.Psychologist.User?.Name ?? string.Empty,
                    patient.Psychologist.CRP,
                    ProfilePictureUrl = patient.Psychologist.User?.ProfilePictureUrl
                }
                : null,
            PendingPsychologist = patient.PendingPsychologist != null
                ? new
                {
                    patient.PendingPsychologist.Id,
                    Name = patient.PendingPsychologist.User?.Name ?? string.Empty,
                    patient.PendingPsychologist.CRP,
                    ProfilePictureUrl = patient.PendingPsychologist.User?.ProfilePictureUrl
                }
                : null
        });
    }

    [HttpGet("documents")]
    [Authorize(Roles = "Patient")]
    public async Task<ActionResult<IEnumerable<PatientDocument>>> GetDocuments()
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null) return NotFound("Patient profile not found.");

        return Ok((patient.Documents ?? [])
            .OrderByDescending(d => d.UploadedAtUtc)
            .ToList());
    }

    [HttpPost("documents/upload")]
    [Consumes("multipart/form-data")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UploadDocument(IFormFile file, [FromForm] string kind, [FromForm] string? displayName)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");
        if (string.IsNullOrWhiteSpace(kind))
            return BadRequest("Kind is required.");
        if (kind.Trim().Length > 50)
            return BadRequest("Kind maximum length is 50 characters.");

        if (file.Length > MaxFileSizeBytes)
            return BadRequest($"File too large. Maximum allowed: {MaxFileSizeBytes / (1024 * 1024)}MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            return BadRequest($"Extension {extension} not supported.");

        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null)
            return NotFound("Patient profile not found.");

        var patientFolder = Path.Combine(env.WebRootPath, "uploads", patient.Id.ToString(), "documents");
        if (!Directory.Exists(patientFolder))
            Directory.CreateDirectory(patientFolder);

        var storedFileName = BuildStoredFileName(Path.GetFileNameWithoutExtension(file.FileName), extension);
        var filePath = Path.Combine(patientFolder, storedFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        string? csvContent = null;
        PatientDocumentCsvSummary? csvSummary = null;

        if (extension == ".csv")
        {
            using var reader = new StreamReader(filePath);
            csvContent = await reader.ReadToEndAsync();
            var lines = csvContent
                .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .ToList();

            if (lines.Count >= 1)
                csvSummary = BuildCsvSummary(lines);
        }

        var documents = patient.Documents?.ToList() ?? [];
        var relativePath = $"/uploads/{patient.Id}/documents/{storedFileName}";

        var document = new PatientDocument
        {
            Id = Guid.NewGuid(),
            Kind = EnsureKind(kind),
            DisplayName = EnsureDisplayName(displayName) ?? Path.GetFileNameWithoutExtension(file.FileName),
            OriginalFileName = file.FileName,
            MimeType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            Extension = extension,
            RelativePath = relativePath,
            SizeBytes = file.Length,
            UploadedAtUtc = DateTime.UtcNow,
            UploadedByUserId = userId,
            CsvSummary = csvSummary
        };

        documents.Add(document);
        patient.Documents = documents;
        context.Entry(patient).Property(p => p.Documents).IsModified = true;

        await context.SaveChangesAsync();
        return Ok(document);
    }

    [HttpDelete("documents/{documentId:guid}")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> DeleteDocument(Guid documentId)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null)
            return NotFound("Patient profile not found.");

        var documents = patient.Documents?.ToList() ?? [];
        var target = documents.FirstOrDefault(d => d.Id == documentId);
        if (target == null)
            return NotFound("Document not found.");

        var expectedFolder = Path.GetFullPath(Path.Combine(env.WebRootPath, "uploads", patient.Id.ToString(), "documents"));
        var fullPath = Path.GetFullPath(Path.Combine(
            env.WebRootPath,
            target.RelativePath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString())));
        if (fullPath.StartsWith(expectedFolder, StringComparison.OrdinalIgnoreCase) && System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);

        patient.Documents = documents.Where(d => d.Id != documentId).ToList();
        context.Entry(patient).Property(p => p.Documents).IsModified = true;
        await context.SaveChangesAsync();
        return Ok("Document removed.");
    }

    [HttpPost("external-record/upload")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UploadExternalRecord(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".pdf" && extension != ".csv")
            return BadRequest("Only PDF or CSV files are supported.");
        if (file.Length > MaxFileSizeBytes)
            return BadRequest($"File too large. Maximum allowed: {MaxFileSizeBytes / (1024 * 1024)}MB.");

        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null)
            return NotFound("Patient profile not found.");

        var patientFolder = Path.Combine(env.WebRootPath, "uploads", patient.Id.ToString(), "documents");
        if (!Directory.Exists(patientFolder))
            Directory.CreateDirectory(patientFolder);

        var storedFileName = BuildStoredFileName(Path.GetFileNameWithoutExtension(file.FileName), extension);
        var filePath = Path.Combine(patientFolder, storedFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativePath = $"/uploads/{patient.Id}/documents/{storedFileName}";

        var documents = patient.Documents?.ToList() ?? [];
        var document = new PatientDocument
        {
            Id = Guid.NewGuid(),
            Kind = "external_record",
            DisplayName = "Prontuario externo",
            OriginalFileName = file.FileName,
            MimeType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            Extension = extension,
            RelativePath = relativePath,
            SizeBytes = file.Length,
            UploadedAtUtc = DateTime.UtcNow,
            UploadedByUserId = userId,
            CsvSummary = null
        };
        documents.Add(document);
        patient.Documents = documents;
        context.Entry(patient).Property(p => p.Documents).IsModified = true;

        if (extension == ".pdf")
        {
            await context.SaveChangesAsync();
            return Ok(new { type = "pdf", relativePath });
        }

        using var reader = new StreamReader(filePath);
        var content = await reader.ReadToEndAsync();
        var lines = content
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        if (lines.Count < 2)
            return BadRequest("CSV must contain header and at least one data row.");

        var delimiter = ResolveCsvDelimiter(lines[0]);
        var headers = ParseCsvLine(lines[0], delimiter);
        var rows = new List<Dictionary<string, string>>();

        for (var i = 1; i < lines.Count; i++)
        {
            var values = ParseCsvLine(lines[i], delimiter);
            var row = new Dictionary<string, string>();

            for (var j = 0; j < headers.Count; j++)
            {
                var key = headers[j];
                var value = j < values.Count ? values[j] : string.Empty;
                row[key] = value;
            }

            rows.Add(row);
        }

        document.CsvSummary = new PatientDocumentCsvSummary { Rows = rows.Count, Columns = headers };
        patient.Documents = documents;
        context.Entry(patient).Property(p => p.Documents).IsModified = true;
        await context.SaveChangesAsync();

        return Ok(new
        {
            type = "csv",
            rows = rows.Count
        });
    }

    [HttpPost("obstetric-data/upload")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UploadObstetricData(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension))
            return BadRequest("Invalid file extension.");
        if (file.Length > MaxFileSizeBytes)
            return BadRequest($"File too large. Maximum allowed: {MaxFileSizeBytes / (1024 * 1024)}MB.");

        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null)
            return NotFound("Patient profile not found.");

        var patientFolder = Path.Combine(env.WebRootPath, "uploads", patient.Id.ToString(), "documents");
        if (!Directory.Exists(patientFolder))
            Directory.CreateDirectory(patientFolder);

        var storedFileName = BuildStoredFileName(Path.GetFileNameWithoutExtension(file.FileName), extension);
        var filePath = Path.Combine(patientFolder, storedFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativePath = $"/uploads/{patient.Id}/documents/{storedFileName}";

        var documents = patient.Documents?.ToList() ?? [];
        var document = new PatientDocument
        {
            Id = Guid.NewGuid(),
            Kind = "obstetric_data",
            DisplayName = "Dados obstetricos",
            OriginalFileName = file.FileName,
            MimeType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            Extension = extension,
            RelativePath = relativePath,
            SizeBytes = file.Length,
            UploadedAtUtc = DateTime.UtcNow,
            UploadedByUserId = userId,
            CsvSummary = null
        };
        documents.Add(document);
        patient.Documents = documents;
        context.Entry(patient).Property(p => p.Documents).IsModified = true;

        if (extension == ".csv")
        {
            using var reader = new StreamReader(filePath);
            var content = await reader.ReadToEndAsync();
            var lines = content
                .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .ToList();

            if (lines.Count < 2)
                return BadRequest("CSV must contain header and at least one data row.");

            var delimiter = ResolveCsvDelimiter(lines[0]);
            var headers = ParseCsvLine(lines[0], delimiter);
            var rows = new List<Dictionary<string, string>>();

            for (var i = 1; i < lines.Count; i++)
            {
                var values = ParseCsvLine(lines[i], delimiter);
                var row = new Dictionary<string, string>();

                for (var j = 0; j < headers.Count; j++)
                {
                    var key = headers[j];
                    var value = j < values.Count ? values[j] : string.Empty;
                    row[key] = value;
                }

                rows.Add(row);
            }

            document.CsvSummary = new PatientDocumentCsvSummary { Rows = rows.Count, Columns = headers };
            patient.Documents = documents;
            context.Entry(patient).Property(p => p.Documents).IsModified = true;
            await context.SaveChangesAsync();

            return Ok(new
            {
                type = "csv",
                rows = rows.Count
            });
        }
        await context.SaveChangesAsync();

        return Ok(new
        {
            type = "file",
            relativePath
        });
    }

    [HttpPut("profile")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdatePatientProfileDto dto)
    {
        if (!IsValidCpf(dto.Cpf)) return BadRequest("CPF must contain 11 digits.");
        if (!IsValidZipCode(dto.ZipCode)) return BadRequest("ZipCode must contain 8 digits.");

        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        var patient = await context.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (patient == null || patient.User == null) return NotFound("Patient profile not found.");

        patient.User.Name = dto.Name ?? patient.User.Name;
        patient.User.BirthDate = NormalizeToUtc(dto.BirthDate);
        patient.User.Street = dto.Street;
        patient.User.AddressNumber = dto.AddressNumber;
        patient.User.AddressComplement = dto.AddressComplement;
        patient.User.Neighborhood = dto.Neighborhood;
        patient.User.City = dto.City;
        patient.User.State = dto.State;
        patient.User.ZipCode = string.IsNullOrWhiteSpace(dto.ZipCode) ? null : new string(dto.ZipCode.Where(char.IsDigit).ToArray());
        patient.User.Cpf = string.IsNullOrWhiteSpace(dto.Cpf) ? null : new string(dto.Cpf.Where(char.IsDigit).ToArray());
        patient.User.BiologicalSex = dto.BiologicalSex;

        await context.SaveChangesAsync();
        return Ok("Profile updated successfully.");
    }
}
