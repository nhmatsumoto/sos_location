namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Solver explícito de diferenças finitas (2ª ordem no tempo e espaço, malha
/// de 5 pontos) para a equação de onda escalar ∂²u/∂t² = Vs(x,y)²·∇²u — o
/// análogo acústico usado para propagação de onda SH (cisalhamento horizontal)
/// em meio com Vs espacialmente variável e densidade constante. Acoplamento
/// P-SV completo (2 componentes) fica para uma iteração futura sobre a mesma
/// malha/infraestrutura, quando maior fidelidade for necessária.
/// </summary>
public sealed class ElasticWaveFdtd
{
    private readonly int _cols;
    private readonly int _rows;
    private readonly double _dx;
    private readonly double[] _vs2;
    private readonly double[] _dampingProfile;
    private double[] _uPrev;
    private double[] _uCurr;
    private double[] _uNext;

    public double TimeStepSeconds { get; }
    public double ElapsedSeconds { get; private set; }
    public int Cols => _cols;
    public int Rows => _rows;

    public ElasticWaveFdtd(int cols, int rows, double dxMeters, double[] shearVelocityFieldMps,
        double courantNumber, int spongeWidthCells = 12)
    {
        if (shearVelocityFieldMps.Length != cols * rows)
            throw new ArgumentException("Shear velocity field size must equal cols*rows.", nameof(shearVelocityFieldMps));
        if (courantNumber is <= 0 or > 1)
            throw new ArgumentOutOfRangeException(nameof(courantNumber), "Courant number must be in (0, 1] for CFL stability.");

        _cols = cols;
        _rows = rows;
        _dx = dxMeters;
        _vs2 = new double[shearVelocityFieldMps.Length];
        var vsMax = 0.0;
        for (var i = 0; i < shearVelocityFieldMps.Length; i++)
        {
            _vs2[i] = shearVelocityFieldMps[i] * shearVelocityFieldMps[i];
            if (shearVelocityFieldMps[i] > vsMax) vsMax = shearVelocityFieldMps[i];
        }

        // Condição CFL para o esquema explícito 2D: dt <= dx / (Vmax * sqrt(2)).
        TimeStepSeconds = courantNumber * dxMeters / (vsMax * Math.Sqrt(2.0));

        _uPrev = new double[cols * rows];
        _uCurr = new double[cols * rows];
        _uNext = new double[cols * rows];
        _dampingProfile = BuildSpongeProfile(cols, rows, spongeWidthCells);
    }

    public double GetDisplacement(int col, int row) => _uCurr[Index(col, row)];

    /// <summary>
    /// Campo de deslocamento atual (cols*rows, row-major) — usado pelo chamador
    /// para derivar aceleração por diferenças centrais entre passos, copiando o
    /// buffer a cada passo (o array retornado é reciclado internamente entre
    /// passos e NÃO deve ser retido sem cópia).
    /// </summary>
    public double[] Field => _uCurr;

    /// <summary>Define o deslocamento (e o estado anterior) de uma célula — usado para condições iniciais.</summary>
    public void SetDisplacement(int col, int row, double value)
    {
        _uCurr[Index(col, row)] = value;
        _uPrev[Index(col, row)] = value;
    }

    /// <summary>
    /// Avança um passo de tempo, injetando <paramref name="sourceForcing"/>
    /// (termo de força, já escalado para as unidades de u/t²) na célula da fonte.
    /// </summary>
    public void Step(int sourceCol, int sourceRow, double sourceForcing)
    {
        var dt2 = TimeStepSeconds * TimeStepSeconds;
        var dx2 = _dx * _dx;

        for (var row = 0; row < _rows; row++)
        {
            for (var col = 0; col < _cols; col++)
            {
                var idx = Index(col, row);
                var left = _uCurr[Index(Math.Max(col - 1, 0), row)];
                var right = _uCurr[Index(Math.Min(col + 1, _cols - 1), row)];
                var down = _uCurr[Index(col, Math.Max(row - 1, 0))];
                var up = _uCurr[Index(col, Math.Min(row + 1, _rows - 1))];
                var laplacian = (left + right + down + up - 4.0 * _uCurr[idx]) / dx2;

                var source = (col == sourceCol && row == sourceRow) ? sourceForcing : 0.0;
                var next = 2.0 * _uCurr[idx] - _uPrev[idx] + dt2 * (_vs2[idx] * laplacian + source);
                _uNext[idx] = next * _dampingProfile[idx];
            }
        }

        (_uPrev, _uCurr, _uNext) = (_uCurr, _uNext, _uPrev);
        ElapsedSeconds += TimeStepSeconds;
    }

    private int Index(int col, int row) => row * _cols + col;

    /// <summary>Camada esponja (perfil tipo Cerjan) nas bordas, para absorver o campo e evitar reflexão artificial.</summary>
    private static double[] BuildSpongeProfile(int cols, int rows, int width)
    {
        var profile = new double[cols * rows];
        for (var row = 0; row < rows; row++)
        {
            for (var col = 0; col < cols; col++)
            {
                var distToEdge = Math.Min(Math.Min(col, cols - 1 - col), Math.Min(row, rows - 1 - row));
                var factor = 1.0;
                if (width > 0 && distToEdge < width)
                {
                    var frac = (double)(width - distToEdge) / width;
                    factor = Math.Exp(-4.0 * frac * frac);
                }
                profile[row * cols + col] = factor;
            }
        }
        return profile;
    }
}
