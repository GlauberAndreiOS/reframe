using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using reframe.Data;

namespace reframe.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProfileController(ApplicationDbContext context, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("zip-code/{cep}")]
    [AllowAnonymous]
    public async Task<IActionResult> LookupZipCode(string cep)
    {
        if (string.IsNullOrWhiteSpace(cep))
            return BadRequest("CEP is required.");

        var digits = new string(cep.Where(char.IsDigit).ToArray());
        if (digits.Length != 8)
            return BadRequest("CEP must contain 8 digits.");

        using var httpClient = new HttpClient();
        var response = await httpClient.GetAsync($"https://viacep.com.br/ws/{digits}/json/");

        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, "Failed to fetch CEP.");

        var content = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(content);

        if (json.RootElement.TryGetProperty("erro", out var erro) && erro.GetBoolean())
            return NotFound("CEP not found.");

        return Ok(new
        {
            cep = json.RootElement.GetProperty("cep").GetString(),
            logradouro = json.RootElement.GetProperty("logradouro").GetString(),
            complemento = json.RootElement.GetProperty("complemento").GetString(),
            bairro = json.RootElement.GetProperty("bairro").GetString(),
            cidade = json.RootElement.GetProperty("localidade").GetString(),
            estado = json.RootElement.GetProperty("uf").GetString()
        });
    }

    [HttpPost("upload-picture")]
    public async Task<IActionResult> UploadProfilePicture(IFormFile file)
    {
        var userId = Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString());
        if (userId == Guid.Empty) return Unauthorized();

        var user = await context.Users.FindAsync(userId);
        if (user == null) return NotFound("User not found.");

        if (file == null || file.Length == 0) return BadRequest("No file uploaded.");

        var uploadsFolder = Path.Combine(env.WebRootPath, "uploads");
        if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

        var fileExtension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(fileExtension)) return BadRequest("Invalid file extension.");

        var fileName = $"{userId}{fileExtension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        // Keep a single profile picture per user using userId-based filename.
        var existingUserPictures = Directory.GetFiles(uploadsFolder, $"{userId}.*");
        foreach (var existingFilePath in existingUserPictures)
            if (!string.Equals(existingFilePath, filePath, StringComparison.OrdinalIgnoreCase))
                System.IO.File.Delete(existingFilePath);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        user.ProfilePictureUrl = $"/uploads/{fileName}";
        await context.SaveChangesAsync();

        return Ok(new { url = user.ProfilePictureUrl });
    }
}
