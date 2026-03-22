import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { generateUuid } from '../lib/uuid';
import { setApiNotifier } from '../services/apiClient';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '../store/authStore';

export type NoticeType = 'info' | 'success' | 'error' | 'warning';

export interface NoticeItem {
  id: string;
  title: string;
  message: string;
  type: NoticeType;
  createdAt: string;
}

interface NotificationsContextValue {
  notices: NoticeItem[];
  pushNotice: (notice: Omit<NoticeItem, 'id' | 'createdAt'>) => void;
  removeNotice: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  const pushNotice = (notice: Omit<NoticeItem, 'id' | 'createdAt'>) => {
    const item: NoticeItem = {
      ...notice,
      id: generateUuid(),
      createdAt: new Date().toISOString(),
    };
    setNotices((prev) => [item, ...prev].slice(0, 40));

    const content = notice.message
      ? `${notice.title} — ${notice.message}`
      : notice.title;
    const opts = { position: 'bottom-right' as const, theme: 'dark' as const, autoClose: 4500 };
    if (notice.type === 'error')   toast.error(content, opts);
    else if (notice.type === 'success') toast.success(content, opts);
    else if (notice.type === 'warning') toast.warning(content, opts);
    else toast.info(content, opts);
  };

  const removeNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    setApiNotifier((title, message) => {
      pushNotice({ title, message, type: 'error' });
    });

    // SignalR Connection
    const token = useAuthStore.getState().token;
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${window.location.origin}/api/hubs/notifications`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    connection.on('ReceiveAlert', (alert: any) => {
      pushNotice({
        title: alert.title,
        message: alert.message,
        type: alert.severity === 'critical' || alert.severity === 'extreme' ? 'error' : 'warning'
      });
    });

    connection.on('UpdateRisk', (risk: any) => {
      pushNotice({
        title: `Risco Atualizado: ${risk.location}`,
        message: `Novo nível de risco: ${risk.level} (${risk.score}%)`,
        type: risk.level === 'Critical' ? 'error' : 'info'
      });
    });

    connection.on('UpdateWeather', (weather: any) => {
      pushNotice({
        title: `Clima: ${weather.locationName || 'Local'}`,
        message: `${weather.condition}: ${weather.temperature}°C`,
        type: 'info'
      });
    });

    connection.start().catch((err: any) => console.error('SignalR Error: ', err));

    return () => {
      connection.stop();
    };
  }, []);

  const value = useMemo(() => ({ notices, pushNotice, removeNotice }), [notices]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
