interface MissingPersonSummary {
  id: string;
  personName: string;
  lastSeenLocation: string;
}

interface ClimakiSnapshotSummary {
  temperatureC: number;
  rainLast24hMm: number;
  rainLast72hMm: number;
  saturationLevel: 'Baixa' | 'Moderada' | 'Alta' | 'Crítica';
  saturationRisk: string;
}

interface LocalConditionsPanelProps {
  missingPeople: MissingPersonSummary[];
  attentionAlertsCount: number;
  loadingMissing: boolean;
  loadingClimaki: boolean;
  climakiError: string;
  climakiSnapshot: ClimakiSnapshotSummary | null;
}

export function LocalConditionsPanel({
  missingPeople,
  attentionAlertsCount,
  loadingMissing,
  loadingClimaki,
  climakiError,
  climakiSnapshot,
}: LocalConditionsPanelProps) {
  return (
    <aside className="absolute left-4 top-4 z-[425] w-80 max-w-[calc(100%-2rem)] rounded-2xl border border-slate-700 bg-slate-950/90 shadow-2xl backdrop-blur-sm">
      <div className="px-3 py-2 border-b border-slate-700">
        <h2 className="text-xs uppercase tracking-[0.14em] text-slate-300 font-semibold">Condições locais</h2>
        <p className="text-[11px] text-slate-400 mt-1">Desaparecidos, chuva, temperatura e status climático da região.</p>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-2">
            <p className="text-[10px] text-slate-400">Desaparecidos</p>
            <p className="text-sm font-semibold text-amber-300">{missingPeople.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-2">
            <p className="text-[10px] text-slate-400">Alertas de atenção</p>
            <p className="text-sm font-semibold text-rose-300">{attentionAlertsCount}</p>
          </div>
        </div>

        {loadingMissing ? (
          <p className="text-xs text-slate-400">Carregando pessoas desaparecidas...</p>
        ) : (
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-2">
            <p className="text-[10px] text-slate-400 mb-1">Últimos registros</p>
            <ul className="space-y-1 max-h-20 overflow-y-auto">
              {missingPeople.slice(0, 3).map((person) => (
                <li key={person.id} className="text-xs text-slate-200">
                  <span className="font-semibold">{person.personName}</span> · {person.lastSeenLocation}
                </li>
              ))}
              {!missingPeople.length && <li className="text-xs text-slate-500">Sem registros recentes.</li>}
            </ul>
          </div>
        )}

        {loadingClimaki ? (
          <p className="text-xs text-slate-400">Atualizando clima local...</p>
        ) : climakiError ? (
          <p className="text-xs text-amber-300">{climakiError}</p>
        ) : climakiSnapshot ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">Temp.</p>
                <p className="text-xs font-semibold text-cyan-200">{climakiSnapshot.temperatureC.toFixed(1)}°C</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">Chuva 24h</p>
                <p className="text-xs font-semibold text-cyan-200">{climakiSnapshot.rainLast24hMm.toFixed(1)} mm</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1.5">
                <p className="text-[10px] text-slate-400">Chuva 72h</p>
                <p className="text-xs font-semibold text-cyan-200">{climakiSnapshot.rainLast72hMm.toFixed(1)} mm</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-2">
              <p className="text-xs font-semibold text-white">Condição: <span className="text-cyan-200">{climakiSnapshot.saturationLevel}</span></p>
              <p className="text-[11px] text-slate-300 mt-1">{climakiSnapshot.saturationRisk}</p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
