using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using reframe.Application.Tenancy;
using reframe.Data;
using reframe.Services;
using reframe.Web;

#region Load .env

var root = Directory.GetCurrentDirectory();
var dotenv = Path.Combine(root, ".env");

if (File.Exists(dotenv))
    foreach (var line in File.ReadAllLines(dotenv))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

        var parts = line.Split('=', 2);
        if (parts.Length != 2) continue;

        Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
    }

#endregion

#region CLI ENV

string? cliTenant = null;
var cliCommand = args.Length > 0 ? args[0].ToLower() : null;

if (cliCommand is "seed" or "reset-db" or "force-seed") cliTenant = args.Length > 1 ? args[1] : "Dev";

#endregion

var builder = WebApplication.CreateBuilder(args);

#region Controllers

builder.Services.AddControllers()
    .AddJsonOptions(o => { o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles; });

#endregion

#region OpenAPI (.NET 10)

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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


    var database = TenantWhitelist.GetDatabaseName(tenant);


    var host = Environment.GetEnvironmentVariable("DBHOST");
    var user = Environment.GetEnvironmentVariable("DBUSER");
    var pass = Environment.GetEnvironmentVariable("DBPASS");

    if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
        throw new InvalidOperationException("Database environment variables not set");

    var connectionString =
        $"Host={host};Database={database};Username={user};Password={pass};Trust Server Certificate=true";

    var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
    dataSourceBuilder.EnableDynamicJson();
    var dataSource = dataSourceBuilder.Build();

    logger.LogInformation(
        "[DbContext] Source: {Source} | Tenant: {Tenant} | Database: {Database}",
        tenantSource,
        tenant,
        database
    );

    options.UseNpgsql(dataSource);
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

if (cliCommand is "seed" or "reset-db" or "force-seed")
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
        
        // If force-seed is used, we might want to bypass the check inside SeedAsync or handle it differently.
        // For now, let's just call SeedAsync. If you want to force it even if data exists, 
        // you might need to modify DataSeeder.cs to accept a 'force' parameter.
        // But based on your request, I'll just call SeedAsync.
        // Note: DataSeeder currently checks 'if (await context.Users.AnyAsync()) return;'
        // So 'seed' command will only work if the DB is empty.
        
        if (cliCommand == "force-seed")
        {
             // To support force-seed without modifying DataSeeder signature too much, 
             // we rely on the user knowing this might duplicate data if not handled carefully in Seeder.
             // However, the current Seeder has a check at the beginning.
             // Let's modify DataSeeder to allow forcing.
             await DataSeeder.SeedAsync(context, force: true);
        }
        else
        {
             await DataSeeder.SeedAsync(context);
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred during the CLI command '{Command}'.", cliCommand);
    }

    return;
}

#endregion

#region WEB MODE

if (app.Environment.IsDevelopment()) app.MapOpenApi("/openapi/v1.json");
app.UseSwagger();
app.UseSwaggerUI();
app.MapGet("/", () => Results.Redirect("/swagger")).AllowAnonymous();

#endregion

// Public uploads route (anonymous): /uploads/{file}
var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.Map("/uploads", uploadsApp =>
{
    uploadsApp.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uploadsPath),
        RequestPath = ""
    });
});

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();


app.UseMiddleware<TenantDatabaseMiddleware>();

app.MapControllers();

app.Run();
