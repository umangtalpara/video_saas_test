import { useAuthStore, UserProfile } from './auth-store';

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should initialize with null state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should set auth data correctly', () => {
    const user: UserProfile = {
      id: 'usr-1',
      name: 'Alex Smith',
      email: 'alex@example.com',
      role: 'user',
      status: 'active',
      emailVerifiedAt: '2026-11-13T10:00:00Z',
      preferences: {
        language: 'en',
        timezone: 'UTC',
        theme: 'dark',
      },
      createdAt: '2026-11-13T10:00:00Z',
    };

    useAuthStore.getState().setAuth(user, {
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-123');
    expect(state.user?.name).toBe('Alex Smith');
  });

  it('should clear auth on logout', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'token',
      refreshToken: 'refresh',
    });

    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });
});

