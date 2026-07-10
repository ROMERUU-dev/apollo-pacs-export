import { describe, expect, it } from 'vitest';
import { apolloLoginURL, apolloLogoutURL, isApolloAuthenticationResponse } from './auth';

describe('Apollo gateway authentication', () => {
  it('returns through the current React path without copying query data', () => {
    expect(apolloLoginURL('/recepcion')).toBe('/oauth2/start?rd=%2Frecepcion');
  });

  it('fails closed for unsafe or authentication return paths', () => {
    expect(apolloLoginURL('//unknown.example/path')).toBe('/oauth2/start?rd=%2F');
    expect(apolloLoginURL('/auth/realms/apollo')).toBe('/oauth2/start?rd=%2F');
    expect(apolloLoginURL('/oauth2/callback')).toBe('/oauth2/start?rd=%2F');
  });

  it('uses the existing oauth2-proxy logout endpoint', () => {
    expect(apolloLogoutURL()).toBe('/oauth2/sign_out?rd=%2F');
  });

  it('recognizes a direct 401 as an expired session', () => {
    expect(isApolloAuthenticationResponse({ status: 401, redirected: false, url: '' })).toBe(true);
  });

  it('recognizes a fetch redirected to the same-origin identity paths', () => {
    expect(isApolloAuthenticationResponse({
      status: 200,
      redirected: true,
      url: 'https://apollo.example/auth/realms/apollo/protocol/openid-connect/auth',
    })).toBe(true);
  });

  it('does not classify an ordinary Apollo response as authentication', () => {
    expect(isApolloAuthenticationResponse({
      status: 200,
      redirected: false,
      url: 'https://apollo.example/api/v1/session',
    })).toBe(false);
  });
});
