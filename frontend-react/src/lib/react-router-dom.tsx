/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type RouterContextValue = {
  path: string;
  navigate: (to: string, replace?: boolean) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const value = useMemo<RouterContextValue>(() => ({
    path,
    navigate: (to: string, replace = false) => {
      if (to === path) return;
      if (replace) {
        window.history.replaceState(null, '', to);
      } else {
        window.history.pushState(null, '', to);
      }
      setPath(to);
    },
  }), [path]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useLocation() {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useLocation must be used within BrowserRouter');
  return { pathname: context.path };
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const context = useContext(RouterContext);
  if (!context) throw new Error('Navigate must be used within BrowserRouter');

  useEffect(() => {
    context.navigate(to, replace);
  }, [context, to, replace]);

  return null;
}

export function Route({ path, element }: { path: string; element: ReactNode }) {
  void path;
  void element;
  return null;
}

export function Routes({ children }: { children: ReactNode }) {
  const context = useContext(RouterContext);
  if (!context) throw new Error('Routes must be used within BrowserRouter');

  const path = context.path;
  const routeElements = (Array.isArray(children) ? children : [children]) as Array<{
    props?: { path?: string; element?: ReactNode };
  }>;

  for (const child of routeElements) {
    const routePath = child?.props?.path;
    if (!routePath) continue;
    if (routePath === path) return <>{child.props?.element ?? null}</>;
  }

  const wildcard = routeElements.find((child) => child?.props?.path === '*');
  return <>{wildcard?.props?.element ?? null}</>;
}
