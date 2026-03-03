import { useEffect } from 'react';
import { CircleAlert, CircleCheckBig, Info, TriangleAlert, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

const styleMap = {
  info: 'border-cyan-500/50 bg-slate-900 text-cyan-100',
  success: 'border-emerald-500/50 bg-slate-900 text-emerald-100',
  warning: 'border-amber-500/50 bg-slate-900 text-amber-100',
  error: 'border-rose-500/50 bg-slate-900 text-rose-100',
} as const;

const iconMap = {
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
  error: CircleAlert,
} as const;

export function ToastStack() {
  const { notices, removeNotice } = useNotifications();

  useEffect(() => {
    const timers = notices.map((notice) => setTimeout(() => removeNotice(notice.id), 4200));
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [notices, removeNotice]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-2">
      {notices.slice(0, 4).map((notice) => {
        const Icon = iconMap[notice.type];
        return (
          <div key={notice.id} className={`pointer-events-auto animate-toast rounded-xl border p-3 shadow-xl ${styleMap[notice.type]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Icon size={16} className="mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">{notice.title}</p>
                  <p className="text-xs opacity-90">{notice.message}</p>
                </div>
              </div>
              <button className="cursor-pointer" onClick={() => removeNotice(notice.id)}>
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
