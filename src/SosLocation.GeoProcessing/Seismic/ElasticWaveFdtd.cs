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
    private readonly double[] _waveScale;
    private readonly double _sourceTimeScale;
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
        var vsMax = 0.0;
        for (var i = 0; i < shearVelocityFieldMps.Length; i++)
        {
            if (shearVelocityFieldMps[i] > vsMax) vsMax = shearVelocityFieldMps[i];
        }

        // Condição CFL para o esquema explícito 2D: dt <= dx / (Vmax * sqrt(2)).
        TimeStepSeconds = courantNumber * dxMeters / (vsMax * Math.Sqrt(2.0));
        _sourceTimeScale = TimeStepSeconds * TimeStepSeconds;
        _waveScale = new double[shearVelocityFieldMps.Length];
        for (var i = 0; i < shearVelocityFieldMps.Length; i++)
        {
            var vs = shearVelocityFieldMps[i];
            _waveScale[i] = _sourceTimeScale * vs * vs / (dxMeters * dxMeters);
        }

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
        for (var row = 0; row < _rows; row++)
        {
            var rowOffset = row * _cols;
            var downOffset = row == 0 ? rowOffset : rowOffset - _cols;
            var upOffset = row == _rows - 1 ? rowOffset : rowOffset + _cols;
            for (var col = 0; col < _cols; col++)
            {
                var idx = rowOffset + col;
                var left = _uCurr[col == 0 ? idx : idx - 1];
                var right = _uCurr[col == _cols - 1 ? idx : idx + 1];
                var down = _uCurr[downOffset + col];
                var up = _uCurr[upOffset + col];
                var neighborDelta = left + right + down + up - 4.0 * _uCurr[idx];
                var next = 2.0 * _uCurr[idx] - _uPrev[idx] + _waveScale[idx] * neighborDelta;
                _uNext[idx] = next * _dampingProfile[idx];
            }
        }

        if (sourceForcing != 0.0
            && sourceCol >= 0 && sourceCol < _cols
            && sourceRow >= 0 && sourceRow < _rows)
        {
            var sourceIndex = sourceRow * _cols + sourceCol;
            _uNext[sourceIndex] += _sourceTimeScale * sourceForcing * _dampingProfile[sourceIndex];
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
