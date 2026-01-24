namespace reframe.Application.Tenancy;

public class TenantResolver
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantResolver(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string Resolve()
    {
        var context = _httpContextAccessor.HttpContext;
        if (context == null)
        {
            return "Prod"; 
        }

        // Default to Prod if header is missing
        var tenant = "Prod";
        
        if (context.Request.Headers.TryGetValue("X-Content-Application", out var tenantValues))
        {
            tenant = tenantValues.ToString();
        }

        if (!TenantWhitelist.IsValid(tenant))
        {
            throw new InvalidOperationException($"Invalid tenant '{tenant}'.");
        }

        return tenant;
    }
}
