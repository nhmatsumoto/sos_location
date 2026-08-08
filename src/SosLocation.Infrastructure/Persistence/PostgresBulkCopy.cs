using System.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace SosLocation.Infrastructure.Persistence;

/// <summary>
/// COPY binário compartilhado por todo bulk insert do backend. Evita popular o
/// ChangeTracker do EF Core com dezenas/centenas de milhares de entidades (uma
/// importação OSM de cidade grande facilmente ultrapassa isso) — o mesmo motivo
/// que já levou <c>SimulationRunStore.BulkInsertResponsesAsync</c> a usar COPY
/// em vez de <c>AddRangeAsync</c>/<c>SaveChangesAsync</c>.
/// </summary>
internal static class PostgresBulkCopy
{
    public static async Task WriteAsync<T>(
        SosDbContext context,
        string copySql,
        IReadOnlyList<T> rows,
        Func<NpgsqlBinaryImporter, T, CancellationToken, Task> writeRow,
        CancellationToken ct,
        TimeSpan? timeout = null)
    {
        if (rows.Count == 0) return;

        var connection = (NpgsqlConnection)context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose) await connection.OpenAsync(ct);
        try
        {
            await using var writer = await connection.BeginBinaryImportAsync(copySql, ct);
            if (timeout is { } value) writer.Timeout = value;
            foreach (var row in rows)
            {
                await writer.StartRowAsync(ct);
                await writeRow(writer, row, ct);
            }

            await writer.CompleteAsync(ct);
        }
        finally
        {
            if (shouldClose) await connection.CloseAsync();
        }
    }

    /// <summary>Escreve um valor nullable de tipo valor, ou NULL binário quando ausente.</summary>
    public static Task WriteNullableAsync<T>(
        this NpgsqlBinaryImporter writer, T? value, NpgsqlDbType type, CancellationToken ct)
        where T : struct
        => value is { } v ? writer.WriteAsync(v, type, ct) : writer.WriteNullAsync(ct);

    /// <summary>Escreve uma string nullable, ou NULL binário quando ausente.</summary>
    public static Task WriteNullableAsync(
        this NpgsqlBinaryImporter writer, string? value, NpgsqlDbType type, CancellationToken ct)
        => value is not null ? writer.WriteAsync(value, type, ct) : writer.WriteNullAsync(ct);
}
