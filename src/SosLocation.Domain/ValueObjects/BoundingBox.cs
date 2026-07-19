namespace SosLocation.Domain.ValueObjects;

/// <summary>
/// Retângulo geográfico em WGS84. Coordenadas em graus decimais.
/// A área é calculada por aproximação equiretangular — adequada para
/// validação de limites de importação, não para engenharia de precisão.
/// </summary>
public readonly record struct BoundingBox
{
    public double West { get; }
    public double South { get; }
    public double East { get; }
    public double North { get; }

    public BoundingBox(double west, double south, double east, double north)
    {
        if (double.IsNaN(west) || double.IsNaN(south) || double.IsNaN(east) || double.IsNaN(north))
            throw new ArgumentException("Bounding box coordinates must be numbers.");
        if (west is < -180 or > 180 || east is < -180 or > 180)
            throw new ArgumentException("Longitude must be within [-180, 180].");
        if (south is < -90 or > 90 || north is < -90 or > 90)
            throw new ArgumentException("Latitude must be within [-90, 90].");
        if (west >= east)
            throw new ArgumentException("West must be less than east (antimeridian-crossing boxes are not supported).");
        if (south >= north)
            throw new ArgumentException("South must be less than north.");

        West = west;
        South = south;
        East = east;
        North = north;
    }

    private const double EarthRadiusMeters = 6_371_008.8;

    /// <summary>Área aproximada em km² (aproximação equiretangular na latitude média).</summary>
    public double AreaKm2
    {
        get
        {
            var midLatRad = (South + North) / 2.0 * Math.PI / 180.0;
            var widthMeters = (East - West) * Math.PI / 180.0 * EarthRadiusMeters * Math.Cos(midLatRad);
            var heightMeters = (North - South) * Math.PI / 180.0 * EarthRadiusMeters;
            return Math.Abs(widthMeters * heightMeters) / 1_000_000.0;
        }
    }

    public (double Lon, double Lat) Center => ((West + East) / 2.0, (South + North) / 2.0);
}
