namespace SosLocation.Domain.ValueObjects;

/// <summary>Nível de confiança de um objeto ou atributo, no intervalo [0, 1].</summary>
public readonly record struct DataConfidence
{
    public double Value { get; }

    public DataConfidence(double value)
    {
        if (double.IsNaN(value) || value is < 0.0 or > 1.0)
            throw new ArgumentOutOfRangeException(nameof(value), value, "Confidence must be within [0, 1].");
        Value = value;
    }

    public static DataConfidence Certain => new(1.0);
    public static DataConfidence Unknown => new(0.5);

    public static implicit operator double(DataConfidence confidence) => confidence.Value;
    public static DataConfidence From(double value) => new(value);

    public override string ToString() => Value.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
}
