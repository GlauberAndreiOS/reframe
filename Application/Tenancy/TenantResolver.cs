namespace reframe.Application.Tenancy;

public class TenantResolver(IHttpContextAccessor httpContextAccessor)
{
    public string Resolve()
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return "Prod";

        var tenant = IsApiIndexOrDocsPath(context.Request.Path) ? "Homolog" : "Prod";

        if (context.Request.Headers.TryGetValue("X-Context-Application", out var tenantValues))
            tenant = tenantValues.ToString();

        return !TenantWhitelist.IsValid(tenant) ? throw new InvalidOperationException($"Invalid tenant '{tenant}'.") : tenant;
    }

    private static bool IsApiIndexOrDocsPath(PathString path)
    {
        if (!path.HasValue) return false;

        return path == "/" ||
               path.StartsWithSegments("/swagger", StringComparison.OrdinalIgnoreCase) ||
               path.StartsWithSegments("/openapi", StringComparison.OrdinalIgnoreCase) ||
               path.StartsWithSegments("/scalar", StringComparison.OrdinalIgnoreCase);
    }
}
