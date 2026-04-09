import type { ReactElement } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import {
  APP_ROUTE_BY_ID,
  APP_ROUTE_MANIFEST,
  type AppRouteDefinition,
} from '../lib/appRouteManifest';

export interface ManagedDomainRouteEntry {
  routeId: string;
  element: ReactElement;
}

interface BuildManagedDomainRoutesOptions {
  basePath: string;
  entries: ManagedDomainRouteEntry[];
  includeAliases?: boolean;
}

const normalizeBasePath = (basePath: string) =>
  basePath !== '/' && basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

const normalizePath = (path: string) =>
  path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;

export const toDomainChildPath = (path: string, basePath: string) => {
  const normalizedBase = normalizeBasePath(basePath);
  const normalizedPath = normalizePath(path);

  if (normalizedPath === normalizedBase) {
    return '';
  }

  const prefix = `${normalizedBase}/`;
  if (!normalizedPath.startsWith(prefix)) {
    throw new Error(`Route path "${path}" does not belong to base "${basePath}"`);
  }

  return normalizedPath.slice(prefix.length);
};

const toProtectedElement = (route: AppRouteDefinition, element: ReactElement) => (
  <ProtectedRoute
    requiredRoles={route.requiredRoles}
    requiredCapabilities={route.requiredCapabilities}
  >
    {element}
  </ProtectedRoute>
);

const toManagedRouteObject = (
  childPath: string,
  element: ReactElement,
): RouteObject => (
  childPath === ''
    ? { index: true, element }
    : { path: childPath, element }
);

export function buildManagedDomainRoutes({
  basePath,
  entries,
  includeAliases = false,
}: BuildManagedDomainRoutesOptions): RouteObject[] {
  const managedRoutes = entries.map(({ routeId, element }) => {
    const route = APP_ROUTE_BY_ID[routeId];
    const childPath = toDomainChildPath(route.path, basePath);

    return toManagedRouteObject(childPath, toProtectedElement(route, element));
  });

  if (!includeAliases) {
    return managedRoutes;
  }

  const normalizedBase = normalizeBasePath(basePath);
  const aliasRoutes = APP_ROUTE_MANIFEST.flatMap((route) =>
    (route.aliases ?? [])
      .filter((alias) => normalizePath(alias).startsWith(`${normalizedBase}/`))
      .map((alias) => {
        const childPath = toDomainChildPath(alias, basePath);
        return toManagedRouteObject(
          childPath,
          toProtectedElement(route, <Navigate to={route.path} replace />),
        );
      }),
  );

  return [...managedRoutes, ...aliasRoutes];
}
