import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { StatusStrip } from './StatusStrip';
import { ToastStack } from '../feedback/ToastStack';
import { NotificationCenter } from '../feedback/NotificationCenter';
import { useNotifications } from '../../context/NotificationsContext';
import { setApiNotifier } from '../../services/apiClient';

interface AppShellProps {
  children: ReactNode;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function AppShell({ children, theme, onToggleTheme }: AppShellProps) {
  const themeClass = theme === 'dark'
    ? 'bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#020617_45%)] text-slate-100'
    : 'bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#f8fafc_55%)] text-slate-900';

  const { notices, pushNotice } = useNotifications();
  const [openCenter, setOpenCenter] = useState(false);

  useEffect(() => {
    setApiNotifier((title, message) => pushNotice({ title, message, type: 'error' }));
  }, [pushNotice]);

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="space-y-3">
          <Topbar
            theme={theme}
            onToggleTheme={onToggleTheme}
            notificationCount={notices.length}
            onOpenNotifications={() => setOpenCenter(true)}
          />
          <StatusStrip />
          {children}
        </main>
      </div>
      <NotificationCenter open={openCenter} onClose={() => setOpenCenter(false)} />
      <ToastStack />
    </div>
  );
}
