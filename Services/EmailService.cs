using System.Net;
using System.Net.Mail;

namespace reframe.Services;

public class EmailService(IConfiguration configuration) : IEmailService
{
    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var smtpHost = configuration["Email:SmtpHost"];
        var smtpPort = int.Parse(configuration["Email:SmtpPort"] ?? "587");
        var smtpUser = configuration["Email:SmtpUser"];
        var smtpPass = configuration["Email:SmtpPass"];

        if (string.IsNullOrEmpty(smtpHost) || string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
        {
            Console.WriteLine("Email configuration missing.");
            return;
        }

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl = true
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(smtpUser),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        mailMessage.To.Add(to);

        await client.SendMailAsync(mailMessage);
    }
}