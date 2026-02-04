using reframe.Application.Tenancy;

namespace reframe.Web;

public class TenantDatabaseMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var tenantResolver = context.RequestServices.GetRequiredService<TenantResolver>();
        var tenant = tenantResolver.Resolve();


        context.Items["CurrentTenant"] = tenant;


        var initializer = context.RequestServices.GetRequiredService<TenantDatabaseInitializer>();
        await initializer.InitializeAsync();

        await next(context);
    }
}