import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { frontendLogger } from '../lib/logger';

/**
 * Hook to manage SignalR hub connections.
 * Automatically handles reconnection and message routing.
 */
export function useSignalR(hubUrl: string, methodNames: string[], onMessage: (methodName: string, data: any) => void) {
  const connection = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const fullUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/hubs${hubUrl}`;
    
    connection.current = new signalR.HubConnectionBuilder()
      .withUrl(fullUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    methodNames.forEach(method => {
      connection.current?.on(method, (data) => {
        frontendLogger.info(`SignalR message received: ${method}`, data);
        onMessage(method, data);
      });
    });

    const startConnection = async () => {
      try {
        await connection.current?.start();
        frontendLogger.info('SignalR Connected to ' + hubUrl);
      } catch (err) {
        frontendLogger.error('SignalR Connection Error: ', err);
        setTimeout(startConnection, 5000);
      }
    };

    startConnection();

    return () => {
      connection.current?.stop();
    };
  }, [hubUrl, JSON.stringify(methodNames)]);

  return connection.current;
}
