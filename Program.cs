using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using reframe.Data;
using reframe.Services;
using Swashbuckle.AspNetCore.Filters;

var root = Directory.GetCurrentDirectory();
var dotenv = Path.Combine(root, ".env");
if (File.Exists(dotenv))
{
    foreach (var line in File.ReadAllLines(dotenv))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
        
        var parts = line.Split('=', 2);
        if (parts.Length != 2) continue;
        
        var key = parts[0].Trim();
        var value = parts[1].Trim();
        
        Environment.SetEnvironmentVariable(key, value);
    }
}

// Lógica para capturar o ambiente via CLI (ex: dotnet run seed Homolog)
string? cliEnv = null;
if (args.Length > 0 && args[0].ToLower() == "seed")
{
    cliEnv = args.Length > 1 ? args[1] : "Dev";
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Description = "Standard Authorization header using the Bearer scheme (\"bearer {token}\")",
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey
    });

    options.OperationFilter<SecurityRequirementsOperationFilter>();
});

builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContext<ApplicationDbContext>((serviceProvider, options) =>
{
    string connectionStringName = "DefaultConnection";

    // Se estamos rodando via CLI (Seed), usamos o ambiente passado por argumento
    if (!string.IsNullOrEmpty(cliEnv))
    {
        connectionStringName = cliEnv.ToLower() switch
        {
            "prod" => "ProdConnection",
            "homolog" => "HomologConnection",
            "dev" => "DevConnection",
            _ => "DefaultConnection"
        };
    }
    else 
    {
        // Se estamos rodando via Web, tentamos pegar do Header
        var httpContext = serviceProvider.GetService<IHttpContextAccessor>()?.HttpContext;
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
        }
    }

    var connectionString = builder.Configuration.GetConnectionString(connectionStringName);
    
    if (string.IsNullOrEmpty(connectionString))
    {
        connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    }

    options.UseSqlServer(connectionString);
});

builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                builder.Configuration.GetSection("Jwt:Key").Value!)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

var app = builder.Build();

// *** MODO SEED ***
if (args.Length > 0 && args[0].ToLower() == "seed")
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<ApplicationDbContext>();
            Console.WriteLine($"Connecting to database for environment: {cliEnv}...");
            
            // Garante que o banco existe antes de seedar
            context.Database.EnsureCreated();
            
            await DataSeeder.SeedAsync(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"An error occurred while seeding the database: {ex.Message}");
        }
    }
    return; // Encerra a aplicação após o seed
}

// *** MODO WEB ***

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "v1");
        options.RoutePrefix = string.Empty;
    });
}

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
