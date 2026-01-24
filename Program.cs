using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using reframe.Data;
using reframe.Services;

// =====================
// Load .env (local only)
// =====================
var root = Directory.GetCurrentDirectory();
var dotenv = Path.Combine(root, ".env");

if (File.Exists(dotenv))
{
    foreach (var line in File.ReadAllLines(dotenv))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
            continue;

        var parts = line.Split('=', 2);
        if (parts.Length != 2)
            continue;

        Environment.SetEnvironmentVariable(
            parts[0].Trim(),
            parts[1].Trim()
        );
    }
}

// =====================
// CLI tenant (dotnet run seed tenant)
// =====================
string? cliTenant = null;

if (args.Length > 0 &&
    args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    cliTenant = args.Length > 1 ? args[1] : null;
}

// =====================
// Required DB env vars
// =====================
var dbHost = Environment.GetEnvironmentVariable("DBHOST");
var dbUser = Environment.GetEnvironmentVariable("DBUSER");
var dbPass = Environment.GetEnvironmentVariable("DBPASS");

if (string.IsNullOrWhiteSpace(dbHost) ||
    string.IsNullOrWhiteSpace(dbUser) ||
    string.IsNullOrWhiteSpace(dbPass))
{
    throw new InvalidOperationException(
        "Defina DBHOST, DBUSER e DBPASS nas variáveis de ambiente."
    );
}

// =====================
// Builder
// =====================
var builder = WebApplication.CreateBuilder(args);

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler =
            ReferenceHandler.IgnoreCycles;
    });

// 🔹 OpenAPI nativo (.NET 10)
builder.Services.AddOpenApi();

// Infra
builder.Services.AddHttpContextAccessor();

// =====================
// DbContext (MULTI-TENANT)
// =====================
builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var httpContext =
        sp.GetRequiredService<IHttpContextAccessor>().HttpContext;

    string tenant;
    string source;

    if (!string.IsNullOrWhiteSpace(cliTenant))
    {
        tenant = cliTenant;
        source = $"CLI ({tenant})";
    }
    else
    {
        tenant =
            httpContext?.Request.Headers["X-Context-Application"]
                .ToString();

        if (string.IsNullOrWhiteSpace(tenant))
        {
            tenant = "default";
            source = "Header missing (default)";
        }
        else
        {
            source = $"Header ({tenant})";
        }
    }

    var databaseName = $"reframeDB_{tenant}";

    var connectionString =
        $"Host={dbHost};" +
        $"Database={databaseName};" +
        $"Username={dbUser};" +
        $"Password={dbPass};";

    sp.GetService<ILogger<Program>>()?
        .LogInformation(
            "[DbContext] Source: {Source} | Database: {Database}",
            source,
            databaseName
        );

    options.UseNpgsql(connectionString);
});

// Services
builder.Services.AddScoped<IEmailService, EmailService>();

// Auth (JWT)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["Jwt:Key"]!
                )
            ),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

// CORS
builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin()
         .AllowAnyMethod()
         .AllowAnyHeader());
});

var app = builder.Build();

// =====================
// SEED MODE
// =====================
if (args.Length > 0 &&
    args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();

    try
    {
        var context =
            scope.ServiceProvider
                 .GetRequiredService<ApplicationDbContext>();

        Console.WriteLine(
            $"Seeding database: reframeDB_{cliTenant ?? "default"}"
        );

        context.Database.EnsureCreated();
        await DataSeeder.SeedAsync(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Seed error: {ex.Message}");
    }

    return;
}

// =====================
// WEB MODE
// =====================
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi("/openapi/v1.json");
}

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
