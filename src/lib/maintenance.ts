export const MAINTENANCE_SETTING_KEY = 'maintenance_mode';

const MAINTENANCE_BYPASS_PATHS = ['/maintenance', '/login', '/reset-password'];

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isMaintenanceBypassPath(pathname: string) {
  return (
    matchesPath(pathname, '/admin') ||
    matchesPath(pathname, '/api') ||
    MAINTENANCE_BYPASS_PATHS.some((path) => matchesPath(pathname, path))
  );
}
