const LOGIN_PATH = '/oauth2/start';
const LOGOUT_PATH = '/oauth2/sign_out';

function safeReturnPath(pathname: string): string {
  const value = pathname.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  const lower = value.toLowerCase();
  if (lower === '/auth' || lower.startsWith('/auth/') || lower === '/oauth2' || lower.startsWith('/oauth2/')) {
    return '/';
  }
  return value;
}

export function apolloLoginURL(pathname: string): string {
  return `${LOGIN_PATH}?rd=${encodeURIComponent(safeReturnPath(pathname))}`;
}

export function apolloLogoutURL(): string {
  return `${LOGOUT_PATH}?rd=${encodeURIComponent('/')}`;
}

export function isApolloAuthenticationResponse(
  response: Pick<Response, 'status' | 'redirected' | 'url'>,
): boolean {
  if (response.status === 401) return true;
  if (!response.redirected || !response.url) return false;

  try {
    const pathname = new URL(response.url).pathname.toLowerCase();
    return pathname === '/auth' || pathname.startsWith('/auth/') ||
      pathname === '/oauth2' || pathname.startsWith('/oauth2/');
  } catch {
    return false;
  }
}
