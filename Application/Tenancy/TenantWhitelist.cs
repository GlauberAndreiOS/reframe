namespace reframe.Application.Tenancy;

public static class TenantWhitelist
{
    private static readonly Dictionary<string, string> Tenants = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Dev"] = "reframeDB_Dev",
        ["Homolog"] = "reframeDB_Homolog",
        ["Prod"] = "reframeDB_Prod"
    };

    public static bool IsValid(string tenant)
    {
        return Tenants.ContainsKey(tenant);
    }

    public static string GetDatabaseName(string tenant)
    {
        return 
            Tenants.TryGetValue(tenant, out var database) ? 
                database :
                throw new InvalidOperationException($"Tenant '{tenant}' is not in the whitelist.");
    }
}