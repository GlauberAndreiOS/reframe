using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using reframe.Application.Tenancy;
using reframe.Data;
using reframe.Services;
using reframe.Web;

#region Load .env
var root = Directory.GetCurrentDirectory();
var dotenv = Path.Combine(root, ".env");

if (File.Exists(dotenv))
{
    foreach (var line in File.ReadAllLines(dotenv))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

        var parts = line.Split('=', 2);
        if (parts.Length != 2) continue;

        Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
    }
}
#endregion

#region CLI ENV
// ==========================================================================================
// WARNING: TEMPORARY CODE FOR FORCED PRODUCTION DATABASE RESET
// This code will cause the application to WIPE and RESET the 'Prod' tenant database
// on startup, and then the application will EXIT.
// THIS MUST BE REMOVED after the successful deployment to allow the web app to run normally.
// To revert, restore the original code that reads from the 'args' array.
// ==========================================================================================
string? cliCommand = "reset-db";
string? cliTenant = "Prod"; // Forcing reset on the Production tenant.

/*
// --- Original code for reference when reverting: ---
string? cliTenant = null;
string? cliCommand = args.Length > 0 ? args[0].ToLower() : null;

if (cliCommand is "seed" or "reset-db")
{
    cliTenant = args.Length > 1 ? args[1] : "Dev";
}
*/
#endregion

var builder = WebApplication.CreateBuilder(args);

#region Controllers
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });
#endregion

#region OpenAPI (.NET 10)
builder.Services.AddOpenApi();
#endregion

builder.Services.AddHttpContextAccessor();

#region Tenancy Services
builder.Services.AddScoped<TenantResolver>();
builder.Services.AddScoped<TenantDatabaseInitializer>();
#endregion

#region DbContext
builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var logger = sp.GetRequiredService<ILogger<Program>>();
    
    // 1️⃣ Resolve tenant
    string tenant;
    string tenantSource;

    if (!string.IsNullOrEmpty(cliTenant))
    {
        tenant = cliTenant;
        tenantSource = $"CLI ({cliTenant})";
    }
    else
    {
        var resolver = sp.GetRequiredService<TenantResolver>();
        tenant = resolver.Resolve();
        tenantSource = "Header";
    }

    // 2️⃣ Whitelist & Database Name
    var database = TenantWhitelist.GetDatabaseName(tenant);

    // 3️⃣ Build connection string
    var host = Environment.GetEnvironmentVariable("DBHOST");
    var user = Environment.GetEnvironmentVariable("DBUSER");
    var pass = Environment.GetEnvironmentVariable("DBPASS");

    if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
        throw new InvalidOperationException("Database environment variables not set");

    var connectionString =
        $"Host={host};Database={database};Username={user};Password={pass};Trust Server Certificate=true";

    logger.LogInformation(
        "[DbContext] Source: {Source} | Tenant: {Tenant} | Database: {Database}",
        tenantSource,
        tenant,
        database
    );

    options.UseNpgsql(connectionString);
});
#endregion

#region Services
builder.Services.AddScoped<IEmailService, EmailService>();
#endregion

#region Auth
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
            ),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });
#endregion

#region CORS
builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin()
         .AllowAnyMethod()
         .AllowAnyHeader());
});
#endregion

var app = builder.Build();

#region CLI Commands
if (cliCommand is "seed" or "reset-db")
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        if (cliCommand == "reset-db")
        {
            logger.LogWarning("--- DELETING DATABASE for tenant {Tenant} ---", cliTenant);
            await context.Database.EnsureDeletedAsync();
            logger.LogInformation("Database deleted successfully.");
        }

        logger.LogInformation("--- Running migrations for tenant {Tenant} ---", cliTenant);
        await context.Database.MigrateAsync();
        logger.LogInformation("Migrations applied successfully.");
        
        logger.LogInformation("--- Seeding database for tenant {Tenant} ---", cliTenant);
        await DataSeeder.SeedAsync(context);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during the CLI command '{Command}'.", cliCommand);
    }

    return; // Exit after command is done.
}
#endregion

#region WEB MODE
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi("/openapi/v1.json");
}
#endregion

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Register Tenant Middleware
app.UseMiddleware<TenantDatabaseMiddleware>();

app.MapControllers();

app.Run();
