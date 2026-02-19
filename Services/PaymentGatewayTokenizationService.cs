using System.Security.Cryptography;

namespace reframe.Services;

public interface IPaymentGatewayTokenizationService
{
    string TokenizeCard(string cardNumber, string holderName, int expMonth, int expYear);
}

public class PaymentGatewayTokenizationService : IPaymentGatewayTokenizationService
{
    public string TokenizeCard(string cardNumber, string holderName, int expMonth, int expYear)
    {
        // Simula tokenização no gateway e evita armazenar PAN no sistema.
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        return $"tok_{random}";
    }
}
