import { useEffect, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import { frontendLogger } from '../lib/logger';

/**
 * Hook to manage SignalR hub connections.
 * Automatically handles reconnection and message routing.
 */
export function useSignalR(hubUrl: string, methodNames: string[], onMessage: (methodName: string, data: unknown) => void) {
  const methodNamesKey = JSON.stringify(methodNames);
  const fullUrl = useMemo(() => `${import.meta.env.VITE_API_BASE_URL || ''}/hubs${hubUrl}`, [hubUrl]);
  const connection = useMemo(
    () =>
      new signalR.HubConnectionBuilder()
        .withUrl(fullUrl, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build(),
    [fullUrl],
  );

  useEffect(() => {
    let cancelled = false;
    const subscribedMethods = JSON.parse(methodNamesKey) as string[];

    const handlers = subscribedMethods.map((method) => {
      const handler = (data: unknown) => {
        frontendLogger.info(`SignalR message received: ${method}`, data);
        onMessage(method, data);
      };
      connection.on(method, handler);
      return { method, handler };
    });

    const startConnection = async () => {
      try {
        await connection.start();
        frontendLogger.info('SignalR Connected to ' + hubUrl);
      } catch (error) {
        frontendLogger.error('SignalR Connection Error: ', error);
        if (!cancelled) {
          window.setTimeout(() => {
            if (!cancelled) {
              void startConnection();
            }
          }, 5000);
        }
      }
    };

    void startConnection();

    return () => {
      cancelled = true;
      handlers.forEach(({ method, handler }) => connection.off(method, handler));
      void connection.stop();
    };
  }, [connection, hubUrl, methodNamesKey, onMessage]);

  return connection;
}
