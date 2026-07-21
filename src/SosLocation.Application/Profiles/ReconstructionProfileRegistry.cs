using SosLocation.Domain.Reconstruction;

namespace SosLocation.Application.Profiles;

/// <summary>Registro de perfis de reconstrução conhecidos, resolvidos por nome versionado.</summary>
public sealed class ReconstructionProfileRegistry
{
    private readonly Dictionary<string, ReconstructionProfile> _profiles;

    public ReconstructionProfileRegistry(IEnumerable<ReconstructionProfile>? extraProfiles = null)
    {
        _profiles = new Dictionary<string, ReconstructionProfile>(StringComparer.OrdinalIgnoreCase)
        {
            [ReconstructionProfile.OsmBasicV1.Name] = ReconstructionProfile.OsmBasicV1,
        };
        foreach (var profile in extraProfiles ?? [])
            _profiles[profile.Name] = profile;
    }

    public bool TryGet(string name, out ReconstructionProfile profile)
        => _profiles.TryGetValue(name, out profile!);

    public IReadOnlyCollection<string> Names => _profiles.Keys;
}
