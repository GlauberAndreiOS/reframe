using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using reframe.Data;
using reframe.Services;

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

// CLI env (dotnet run seed Homolog)
string? cliEnv = null;
if (args.Length > 0 && args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    cliEnv = args.Length > 1 ? args[1] : "Dev";
}

var builder = WebApplication.CreateBuilder(args);

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// 🔹 OpenAPI NATIVO (.NET 10)
builder.Services.AddOpenApi();

// Infra
builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    string connectionStringName = "DefaultConnection";
    string contextSource;

    if (!string.IsNullOrEmpty(cliEnv))
    {
        connectionStringName = cliEnv.ToLower() switch
        {
            "prod" => "ProdConnection",
            "homolog" => "HomologConnection",
            "dev" => "DevConnection",
            _ => "DefaultConnection"
        };
        contextSource = $"CLI ({cliEnv})";
    }
    else
    {
        var httpContext = sp.GetService<IHttpContextAccessor>()?.HttpContext;
        var envHeader = httpContext?.Request.Headers["X-Context-Application"].ToString();

        if (!string.IsNullOrEmpty(envHeader))
        {
            connectionStringName = envHeader.ToLower() switch
            {
                "prod" => "ProdConnection",
                "homolog" => "HomologConnection",
                "dev" => "DevConnection",
                _ => "DefaultConnection"
            };
            contextSource = $"Header ({envHeader})";
        }
        else
        {
            contextSource = "Header Missing (Default)";
        }
    }

    var connectionString =
        builder.Configuration.GetConnectionString(connectionStringName)
        ?? builder.Configuration.GetConnectionString("DefaultConnection");

    sp.GetService<ILogger<Program>>()?
        .LogInformation("[DbContext] Source: {Source} | Connection: {Conn}",
            contextSource, connectionStringName);

    options.UseNpgsql(connectionString);
});

// Services
builder.Services.AddScoped<IEmailService, EmailService>();

// Auth
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

// CORS
builder.Services.AddCors(o =>
{
    o.AddPolicy("AllowAll", p =>
        p.AllowAnyOrigin()
         .AllowAnyMethod()
         .AllowAnyHeader());
});

var app = builder.Build();

// ***** SEED MODE *****
if (args.Length > 0 && args[0].Equals("seed", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Console.WriteLine($"Connecting to database for environment: {cliEnv}...");

        context.Database.EnsureCreated();
        await DataSeeder.SeedAsync(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Seed error: {ex.Message}");
    }

    return;
}

// ***** WEB MODE *****

if (app.Environment.IsDevelopment())
{
    // 🔹 OpenAPI endpoint nativo
    app.MapOpenApi("/openapi/v1.json");
}

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
