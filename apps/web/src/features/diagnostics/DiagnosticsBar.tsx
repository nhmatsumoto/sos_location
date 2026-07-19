import { useAppStore } from '../../stores/appStore';

function Item({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-mono text-xs text-slate-200">{value}</span>
    </span>
  );
}

export function DiagnosticsBar() {
  const camera = useAppStore((s) => s.camera);
  const fps = useAppStore((s) => s.fps);
  const tileStats = useAppStore((s) => s.tileStats);
  const revision = useAppStore((s) => s.selectedRevision);

  return (
    <footer
      data-testid="diagnostics-bar"
      className="flex h-8 items-center gap-5 border-t border-slate-800 bg-slate-950 px-4"
    >
      <Item label="fps" value={String(fps)} />
      <Item label="tiles" value={`${tileStats.loaded} loaded / ${tileStats.pending} pending`} />
      <Item label="zoom" value={camera ? camera.zoom.toFixed(2) : '—'} />
      <Item label="lon" value={camera ? camera.longitude.toFixed(5) : '—'} />
      <Item label="lat" value={camera ? camera.latitude.toFixed(5) : '—'} />
      <Item label="pitch" value={camera ? `${camera.pitch.toFixed(0)}°` : '—'} />
      <Item label="bearing" value={camera ? `${camera.bearing.toFixed(0)}°` : '—'} />
      <span className="ml-auto text-[11px] text-slate-500">
        {revision
          ? `revision #${revision.revisionNumber} · ${revision.status}`
          : 'no revision loaded'}
      </span>
    </footer>
  );
}
