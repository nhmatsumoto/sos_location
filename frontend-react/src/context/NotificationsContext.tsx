import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { generateUuid } from '../lib/uuid';
import { setApiNotifier } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';
import {
  NotificationsContext,
  type NoticeItem,
} from './notificationsContext';

interface AlertNotificationPayload {
  title: string;
  message: string;
  severity?: 'critical' | 'extreme' | 'high' | 'medium' | 'low' | string;
}

interface RiskUpdatePayload {
  location: string;
  level: string;
  score: number;
}

interface WeatherUpdatePayload {
  locationName?: string;
  condition: string;
  temperature: number;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  const pushNotice = useCallback((notice: Omit<NoticeItem, 'id' | 'createdAt'>) => {
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
    if (notice.type === 'error') toast.error(content, opts);
    else if (notice.type === 'success') toast.success(content, opts);
    else if (notice.type === 'warning') toast.warning(content, opts);
    else toast.info(content, opts);
  }, []);

  const removeNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  useEffect(() => {
    setApiNotifier((title, message) => {
      pushNotice({ title, message, type: 'error' });
    });

    const token = useAuthStore.getState().token;
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${window.location.origin}/api/hubs/notifications`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    connection.on('ReceiveAlert', (alert: AlertNotificationPayload) => {
      pushNotice({
        title: alert.title,
        message: alert.message,
        type: alert.severity === 'critical' || alert.severity === 'extreme' ? 'error' : 'warning'
      });
    });

    connection.on('UpdateRisk', (risk: RiskUpdatePayload) => {
      pushNotice({
        title: `Risco Atualizado: ${risk.location}`,
        message: `Novo nível de risco: ${risk.level} (${risk.score}%)`,
        type: risk.level === 'Critical' ? 'error' : 'info'
      });
    });

    connection.on('UpdateWeather', (weather: WeatherUpdatePayload) => {
      pushNotice({
        title: `Clima: ${weather.locationName || 'Local'}`,
        message: `${weather.condition}: ${weather.temperature}°C`,
        type: 'info'
      });
    });

    connection.start().catch((error: unknown) => console.error('SignalR Error: ', error));

    return () => {
      void connection.stop();
    };
  }, [pushNotice]);

  const value = useMemo(() => ({ notices, pushNotice, removeNotice }), [notices, pushNotice, removeNotice]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
