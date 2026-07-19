using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SosLocation.Infrastructure.Persistence;

/// <summary>Fábrica usada apenas pelo dotnet-ef para gerar migrations sem subir o host.</summary>
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<SosDbContext>
{
    public SosDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("SOS_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=sos_location;Username=sos;Password=sos_dev_password";
        var options = new DbContextOptionsBuilder<SosDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite())
            .Options;
        return new SosDbContext(options);
    }
}
