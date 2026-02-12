namespace reframe.Application.Tenancy;

public class TenantResolver(IHttpContextAccessor httpContextAccessor)
{
    private const string ContextHeader = "X-Context-Application";

    public string Resolve()
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null) return "Prod";

        var tenant = IsApiIndexOrDocsPath(context.Request.Path) ? "Homolog" : "Prod";

        if (TryGetTenantFromHeader(context, out var headerTenant))
            tenant = headerTenant;

        return !TenantWhitelist.IsValid(tenant) ? throw new InvalidOperationException($"Invalid tenant '{tenant}'.") : tenant;
    }

    private static bool TryGetTenantFromHeader(HttpContext context, out string tenant)
    {
        tenant = string.Empty;

        if (context.Request.Headers.TryGetValue(ContextHeader, out var contextValues))
        {
            var value = contextValues.ToString().Trim();
            if (!string.IsNullOrWhiteSpace(value))
            {
                tenant = value;
                return true;
            }
        }

        return false;
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
