using Microsoft.EntityFrameworkCore;
using reframe.Data;

namespace reframe.Services;

public interface ILgpdService
{
    Task<object> ExportUserDataAsync(Guid userId);
    Task<(bool Removed, string Reason)> RemoveOrAnonymizeUserAsync(Guid userId);
}

public class LgpdService(ApplicationDbContext context) : ILgpdService
{
    public async Task<object> ExportUserDataAsync(Guid userId)
    {
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        var patient = await context.Patients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var psychologist = await context.Psychologists
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var financial = await context.FinancialRecords
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.OccurredAt)
            .ToListAsync();

        return new
        {
            User = user,
            Patient = patient,
            Psychologist = psychologist,
            FinancialRecords = financial
        };
    }

    public async Task<(bool Removed, string Reason)> RemoveOrAnonymizeUserAsync(Guid userId)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return (false, "Usuário não encontrado.");

        var now = DateTime.UtcNow;
        var hasFinancialRetention = await context.FinancialRecords
            .AnyAsync(f => f.UserId == userId && f.LegalRetentionUntil > now);

        user.Name = "Titular Anonimizado";
        user.Username = $"anon-{user.Id}@deleted.local";
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"));
        user.Cpf = null;
        user.BirthDate = null;
        user.Street = null;
        user.AddressNumber = null;
        user.AddressComplement = null;
        user.Neighborhood = null;
        user.City = null;
        user.State = null;
        user.ZipCode = null;
        user.ProfilePictureUrl = null;
        user.ResetToken = null;
        user.ResetTokenExpires = null;
        user.DeletedAt = now;
        user.IsAnonymized = true;

        await context.SaveChangesAsync();

        return hasFinancialRetention
            ? (true, "Dados pessoais anonimizados; registros financeiros preservados por obrigação legal.")
            : (true, "Dados pessoais anonimizados com sucesso.");
    }
}
