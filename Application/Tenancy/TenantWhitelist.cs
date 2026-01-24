namespace reframe.Application.Tenancy;

public static class TenantWhitelist
{
    public static readonly Dictionary<string, string> Tenants = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Dev"] = "reframeDB_Dev",
        ["Homolog"] = "reframeDB_Homolog",
        ["Prod"] = "reframeDB_Prod"
    };

    public static bool IsValid(string tenant) => Tenants.ContainsKey(tenant);

    public static string GetDatabaseName(string tenant)
    {
        if (Tenants.TryGetValue(tenant, out var database))
        {
            return database;
        }
        throw new InvalidOperationException($"Tenant '{tenant}' is not in the whitelist.");
    }
}
