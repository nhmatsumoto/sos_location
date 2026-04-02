const TOKEN_KEY = 'sos_location_token';

export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
}
