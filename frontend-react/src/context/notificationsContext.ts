import { createContext } from 'react';

export type NoticeType = 'info' | 'success' | 'error' | 'warning';

export interface NoticeItem {
  id: string;
  title: string;
  message: string;
  type: NoticeType;
  createdAt: string;
}

export interface NotificationsContextValue {
  notices: NoticeItem[];
  pushNotice: (notice: Omit<NoticeItem, 'id' | 'createdAt'>) => void;
  removeNotice: (id: string) => void;
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);
