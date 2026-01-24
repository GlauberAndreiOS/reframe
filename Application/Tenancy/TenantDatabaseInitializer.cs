using Microsoft.EntityFrameworkCore;
using reframe.Data;

namespace reframe.Application.Tenancy;

public class TenantDatabaseInitializer
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TenantDatabaseInitializer> _logger;

    public TenantDatabaseInitializer(ApplicationDbContext context, ILogger<TenantDatabaseInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        try
        {
            await _context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initializing the tenant database.");
            throw;
        }
    }
}
