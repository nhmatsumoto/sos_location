import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../context/useNotifications';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { notices } = useNotifications();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9900] flex justify-end bg-black/40" onClick={onClose}>
      <aside className="h-full w-full max-w-md animate-panel rounded-l-2xl border-l border-slate-700 bg-slate-950 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-cyan-300" />
            <h3 className="text-sm font-semibold text-slate-100">Centro de notificações</h3>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:bg-slate-800">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto">
          {notices.length === 0 && <p className="text-xs text-slate-400">Sem notificações no momento.</p>}
          {notices.map((notice) => (
            <article key={notice.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{notice.type}</p>
              <p className="text-sm font-semibold text-slate-100">{notice.title}</p>
              <p className="text-xs text-slate-300">{notice.message}</p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
