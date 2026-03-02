import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { generateUuid } from '../lib/uuid';

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
  };

  const removeNotice = (id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

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
