const TOKEN_KEY = 'sos_location_token';

export function getSessionToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
}

export function setSessionToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
