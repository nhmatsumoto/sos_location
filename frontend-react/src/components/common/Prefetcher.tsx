import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Prefetcher monitors the current route and proactively fetches 
 * assets for the next logical steps in the user journey.
 */
export function Prefetcher() {
  const location = useLocation();

  useEffect(() => {
    // 1. If user is at Onboarding or Landing, prefetch critical main app modules
    if (location.pathname === '/' || location.pathname === '/login') {
      const timer = setTimeout(() => {
        // We use dynamic imports without .tsx to satisfy typical build tool logic
        // and ensure chunks are loaded into browser cache early.
        Promise.all([
          import('../../pages/OperationalMapPage'),
          import('../../LandslideSimulation'),
          import('../../PostDisasterSplat'),
          import('../../pages/SOSPage')
        ]).catch(() => {
          // Silent catch for prefetch errors
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return null;
}
