using Microsoft.EntityFrameworkCore;
using reframe.Models;

namespace reframe.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context, bool force = false)
    {
        if (!force && await context.Users.AnyAsync())
        {
            Console.WriteLine("Database already seeded. Skipping...");
            return;
        }

        Console.WriteLine("Seeding database...");


        const string defaultPassword = "ReframeHomolog#1.0";
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword);

        var random = new Random();

        var firstNames = new[]
        {
            "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Julia", "Lucas",
            "Mariana", "Nicolas", "Olivia", "Pedro", "Rafaela", "Samuel", "Tatiana", "Vitor", "Yasmin"
        };
        var lastNames = new[]
        {
            "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Gomes",
            "Costa", "Ribeiro", "Martins"
        };
        var ufs = new[]
        {
            "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
            "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
        };

        var situations = new[]
        {
            "Apresentação no trabalho", "Discussão com o parceiro", "Trânsito intenso", "Recebi uma crítica",
            "Festa com desconhecidos", "Erro no relatório", "Esperando resposta de mensagem"
        };
        var thoughts = new[]
        {
            "Vou travar e todos vão rir", "Ele não gosta mais de mim", "Vou me atrasar e ser demitido",
            "Sou incompetente", "Ninguém quer falar comigo", "Nunca faço nada direito",
            "Estão me ignorando de propósito"
        };
        var emotions = new[] { "Ansiedade", "Tristeza", "Raiva", "Vergonha", "Medo", "Culpa", "Frustração" };
        var behaviors = new[]
        {
            "Fiquei quieto", "Gritei", "Chorei", "Fugi da situação", "Comi excessivamente", "Procrastinei",
            "Pedi desculpas excessivamente"
        };


        var psychologists = new List<Psychologist>();

        for (var i = 0; i < 5; i++)
        {
            var name = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}";
            var username = $"psi{i + 1}@reframe.com";

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = "Dr(a). " + name,
                Username = username,
                PasswordHash = passwordHash,
                UserType = UserType.Psychologist
            };

            context.Users.Add(user);

            var uf = ufs[random.Next(ufs.Length)];
            var psychologist = new Psychologist
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CRP = $"{random.Next(10, 99)}/{random.Next(10000, 99999)} {uf}"
            };

            context.Psychologists.Add(psychologist);
            psychologists.Add(psychologist);
        }
        
        // Specific Psychologist for Homolog
        var specificPsychologistUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Natália Marcela Pain Oliveira",
            Username = "natypain@live.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("120797"),
            UserType = UserType.Psychologist
        };
        context.Users.Add(specificPsychologistUser);
        
        var specificPsychologist = new Psychologist
        {
            Id = Guid.NewGuid(),
            UserId = specificPsychologistUser.Id,
            CRP = "14/09810 MS"
        };
        context.Psychologists.Add(specificPsychologist);
        psychologists.Add(specificPsychologist);

        await context.SaveChangesAsync();


        for (var i = 0; i < 30; i++)
        {
            var name = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}";
            var username = $"paciente{i + 1}@reframe.com";

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = name,
                Username = username,
                PasswordHash = passwordHash,
                UserType = UserType.Patient
            };

            context.Users.Add(user);

            var randomPsychologist = psychologists[random.Next(psychologists.Count)];

            var patient = new Patient
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                PsychologistId = randomPsychologist.Id
            };

            context.Patients.Add(patient);


            for (var j = 0; j < 5; j++)
            {
                var thought = new AutomaticThought
                {
                    Id = Guid.NewGuid(),
                    PatientId = patient.Id,
                    Date = DateTime.UtcNow.AddDays(-random.Next(1, 60)),
                    Situation = situations[random.Next(situations.Length)],
                    Thought = thoughts[random.Next(thoughts.Length)],
                    Emotion = emotions[random.Next(emotions.Length)],
                    Behavior = behaviors[random.Next(behaviors.Length)],
                    EvidencePro = "Senti meu coração acelerar.",
                    EvidenceContra = "Já fiz isso antes e deu certo.",
                    AlternativeThoughts = "Posso me preparar melhor e vai dar tudo certo.",
                    Reevaluation = "Ainda ansioso, mas confiante."
                };
                context.AutomaticThoughts.Add(thought);
            }
        }
        
        // Specific Patient for Homolog
        var specificPatientUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Glauber Andrei Oliveira da Silva Pain",
            Username = "andrei04@hotmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Glbr0412%"),
            UserType = UserType.Patient
        };
        context.Users.Add(specificPatientUser);
        
        var specificPatient = new Patient
        {
            Id = Guid.NewGuid(),
            UserId = specificPatientUser.Id,
            PsychologistId = specificPsychologist.Id
        };
        context.Patients.Add(specificPatient);
        
        var templates = new List<QuestionnaireTemplate>
        {
            new QuestionnaireTemplate
            {
                Id = Guid.NewGuid(),
                Title = "Inventário de Depressão de Beck (BDI)",
                Description = "Avaliação da gravidade da depressão.",
                Category = "TCC",
                IsGlobal = true,
                Questions = new List<Question>
                {
                    new Question { Title = "Tristeza", Type = "radio", Data = new List<string> { "Não me sinto triste", "Sinto-me triste", "Sinto-me triste o tempo todo", "Sinto-me tão triste que não suporto" } },
                    new Question { Title = "Pessimismo", Type = "radio", Data = new List<string> { "Não estou desanimado", "Sinto-me desanimado", "Sinto que não tenho nada a esperar", "Sinto que o futuro é sem esperança" } }
                }
            },
            new QuestionnaireTemplate
            {
                Id = Guid.NewGuid(),
                Title = "Inventário de Ansiedade de Beck (BAI)",
                Description = "Avaliação da gravidade da ansiedade.",
                Category = "TCC",
                IsGlobal = true,
                Questions = new List<Question>
                {
                    new Question { Title = "Dormência ou formigamento", Type = "radio", Data = new List<string> { "Absolutamente não", "Levemente", "Moderadamente", "Gravemente" } },
                    new Question { Title = "Sensação de calor", Type = "radio", Data = new List<string> { "Absolutamente não", "Levemente", "Moderadamente", "Gravemente" } }
                }
            },
            new QuestionnaireTemplate
            {
                Id = Guid.NewGuid(),
                Title = "Registro de Pensamentos Disfuncionais (RPD)",
                Description = "Ferramenta central da TCC para identificar e reestruturar pensamentos.",
                Category = "TCC",
                IsGlobal = true,
                Questions = new List<Question>
                {
                    new Question { Title = "Situação", Type = "text" },
                    new Question { Title = "Pensamento Automático", Type = "text" },
                    new Question { Title = "Emoção", Type = "text" },
                    new Question { Title = "Resposta Racional", Type = "text" },
                    new Question { Title = "Resultado", Type = "text" }
                }
            },
            new QuestionnaireTemplate
            {
                Id = Guid.NewGuid(),
                Title = "Análise Funcional do Comportamento",
                Description = "Avaliação de antecedentes, comportamentos e consequências.",
                Category = "ABA",
                IsGlobal = true,
                Questions = new List<Question>
                {
                    new Question { Title = "Antecedente (O que aconteceu antes?)", Type = "text" },
                    new Question { Title = "Comportamento (O que a pessoa fez?)", Type = "text" },
                    new Question { Title = "Consequência (O que aconteceu depois?)", Type = "text" },
                    new Question { Title = "Função provável do comportamento", Type = "select", Data = new List<string> { "Atenção", "Fuga/Esquiva", "Tangível", "Sensorial" } }
                }
            },
            new QuestionnaireTemplate
            {
                Id = Guid.NewGuid(),
                Title = "Questionário de Esquemas de Young (YSQ)",
                Description = "Identificação de esquemas iniciais desadaptativos.",
                Category = "Terapia do Esquema",
                IsGlobal = true,
                Questions = new List<Question>
                {
                    new Question { Title = "Na maior parte do tempo, não tenho ninguém para me apoiar.", Type = "radio", Data = new List<string> { "Completamente falso", "Falso na maioria das vezes", "Mais verdadeiro que falso", "Descreve-me perfeitamente" } },
                    new Question { Title = "Sinto que as pessoas vão se aproveitar de mim.", Type = "radio", Data = new List<string> { "Completamente falso", "Falso na maioria das vezes", "Mais verdadeiro que falso", "Descreve-me perfeitamente" } }
                }
            }
        };
        
        context.QuestionnaireTemplates.AddRange(templates);

        await context.SaveChangesAsync();
        Console.WriteLine("Database seeded successfully!");
    }
}