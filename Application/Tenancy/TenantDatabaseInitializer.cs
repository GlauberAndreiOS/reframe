using Microsoft.EntityFrameworkCore;
using reframe.Data;

namespace reframe.Application.Tenancy;

public class TenantDatabaseInitializer(ApplicationDbContext context, ILogger<TenantDatabaseInitializer> logger)
{
    public async Task InitializeAsync()
    {
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initializing the tenant database.");
            throw;
        }
    }
}