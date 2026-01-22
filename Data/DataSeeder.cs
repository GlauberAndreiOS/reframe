using reframe.Models;
using BCrypt.Net;

namespace reframe.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        if (context.Users.Any())
        {
            Console.WriteLine("Database already seeded. Skipping...");
            return;
        }

        Console.WriteLine("Seeding database...");

        // 1. Definições Básicas
        const string defaultPassword = "ReframeHomolog#1.0";
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword);
        
        var random = new Random();

        var firstNames = new[] { "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Julia", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro", "Rafaela", "Samuel", "Tatiana", "Vitor", "Yasmin" };
        var lastNames = new[] { "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins" };
        var ufs = new[] { "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO" };
        
        var situations = new[] { "Apresentação no trabalho", "Discussão com o parceiro", "Trânsito intenso", "Recebi uma crítica", "Festa com desconhecidos", "Erro no relatório", "Esperando resposta de mensagem" };
        var thoughts = new[] { "Vou travar e todos vão rir", "Ele não gosta mais de mim", "Vou me atrasar e ser demitido", "Sou incompetente", "Ninguém quer falar comigo", "Nunca faço nada direito", "Estão me ignorando de propósito" };
        var emotions = new[] { "Ansiedade", "Tristeza", "Raiva", "Vergonha", "Medo", "Culpa", "Frustração" };
        var behaviors = new[] { "Fiquei quieto", "Gritei", "Chorei", "Fugi da situação", "Comi excessivamente", "Procrastinei", "Pedi desculpas excessivamente" };

        // 2. Criar 5 Psicólogos
        var psychologists = new List<Psychologist>();
        
        for (int i = 0; i < 5; i++)
        {
            var name = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}";
            var username = $"psi{i+1}@reframe.com";

            var user = new User
            {
                Name = "Dr(a). " + name,
                Username = username,
                PasswordHash = passwordHash,
                UserType = UserType.Psychologist
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();

            var uf = ufs[random.Next(ufs.Length)];
            var psychologist = new Psychologist
            {
                UserId = user.Id,
                CRP = $"{random.Next(10, 99)}/{random.Next(10000, 99999)} {uf}"
            };

            context.Psychologists.Add(psychologist);
            psychologists.Add(psychologist);
        }
        await context.SaveChangesAsync();

        // 3. Criar 30 Pacientes
        for (int i = 0; i < 30; i++)
        {
            var name = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}";
            var username = $"paciente{i+1}@reframe.com";

            var user = new User
            {
                Name = name,
                Username = username,
                PasswordHash = passwordHash,
                UserType = UserType.Patient
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();

            var randomPsychologist = psychologists[random.Next(psychologists.Count)];

            var patient = new Patient
            {
                UserId = user.Id,
                PsychologistId = randomPsychologist.Id
            };

            context.Patients.Add(patient);
            await context.SaveChangesAsync();

            // 4. Criar 5 Pensamentos Automáticos
            for (int j = 0; j < 5; j++)
            {
                var thought = new AutomaticThought
                {
                    PatientId = patient.Id,
                    Date = DateTime.Now.AddDays(-random.Next(1, 60)),
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

        await context.SaveChangesAsync();
        Console.WriteLine("Database seeded successfully!");
    }
}
