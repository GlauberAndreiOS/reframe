using reframe.Application.Tenancy;

namespace reframe.Web;

public class TenantDatabaseMiddleware
{
    private readonly RequestDelegate _next;

    public TenantDatabaseMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Resolve tenant is handled implicitly by DbContext registration which uses IHttpContextAccessor.
        // However, we need to ensure the database is initialized/migrated.
        // We can't inject Scoped services (like ApplicationDbContext or TenantDatabaseInitializer) 
        // into the Middleware constructor (which is Singleton).
        // We must resolve them from the context.RequestServices.

        var tenantResolver = context.RequestServices.GetRequiredService<TenantResolver>();
        var tenant = tenantResolver.Resolve();

        // Validate tenant again or ensure it's set in items if needed, 
        // but DbContext will use the same logic or we can store it.
        context.Items["CurrentTenant"] = tenant;

        // Initialize Database
        var initializer = context.RequestServices.GetRequiredService<TenantDatabaseInitializer>();
        await initializer.InitializeAsync();

        await _next(context);
    }
}
