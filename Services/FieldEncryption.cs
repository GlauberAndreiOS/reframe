using System.Security.Cryptography;
using System.Text;

namespace reframe.Services;

public static class FieldEncryption
{
    private const string Prefix = "enc:";

    private static byte[] GetKey()
    {
        var raw = Environment.GetEnvironmentVariable("FIELD_ENCRYPTION_KEY");
        if (string.IsNullOrWhiteSpace(raw))
        {
            raw = "reframe-default-key-change-me-immediately";
        }

        using var sha = SHA256.Create();
        return sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
    }

    public static string? Encrypt(string? plain)
    {
        if (string.IsNullOrWhiteSpace(plain)) return plain;
        if (plain.StartsWith(Prefix, StringComparison.Ordinal)) return plain;

        var key = GetKey();
        var iv = RandomNumberGenerator.GetBytes(16);

        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        using var encryptor = aes.CreateEncryptor();
        var bytes = Encoding.UTF8.GetBytes(plain);
        var cipher = encryptor.TransformFinalBlock(bytes, 0, bytes.Length);

        var payload = new byte[iv.Length + cipher.Length];
        Buffer.BlockCopy(iv, 0, payload, 0, iv.Length);
        Buffer.BlockCopy(cipher, 0, payload, iv.Length, cipher.Length);

        return Prefix + Convert.ToBase64String(payload);
    }

    public static string? Decrypt(string? cipher)
    {
        if (string.IsNullOrWhiteSpace(cipher)) return cipher;
        if (!cipher.StartsWith(Prefix, StringComparison.Ordinal)) return cipher;

        var base64 = cipher[Prefix.Length..];
        var payload = Convert.FromBase64String(base64);
        if (payload.Length <= 16) return string.Empty;

        var iv = payload[..16];
        var encrypted = payload[16..];

        var key = GetKey();

        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(encrypted, 0, encrypted.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }
}
