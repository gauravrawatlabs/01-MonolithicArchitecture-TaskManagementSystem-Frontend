import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { toApiError } from '@/api/apiError';
import {
  computeRefreshDelay,
  onSessionExpired,
  onSessionRefreshed,
  refreshSession,
} from '@/api/session';
import { onOtherTabSessionChange } from '@/services/sessionSync';
import {
  clearAccessToken,
  clearSession,
  getAccessTokenExpiresAtUtc,
  getRefreshToken,
  setSession,
} from '@/services/tokenStorage';
import { type AuthResponse, type UserProfile } from '@/types/api';

import { authApi } from './api/authApi';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type EndedSession,
} from './authContext';

/** Never schedule proactive refreshes closer than this (guards against loops with a wrong clock). */
const MIN_PROACTIVE_REFRESH_MS = 5_000;

interface SessionState {
  status: AuthStatus;
  user: UserProfile | null;
  accessTokenExpiresAtUtc: string | null;
  endedSession: EndedSession | null;
  sessionCheckFailed: boolean;
}

type SessionAction =
  | { type: 'signedIn'; auth: AuthResponse }
  | { type: 'checking' }
  | { type: 'checkFailed' }
  | { type: 'ended'; ended: EndedSession }
  | { type: 'profileLoaded'; user: UserProfile };

/**
 * All session transitions in one place. A reducer keeps the fields consistent: there is no state
 * where status is "authenticated" without a user, or a stale "ended" notice after signing in.
 */
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'signedIn':
      return {
        status: 'authenticated',
        user: action.auth.user,
        accessTokenExpiresAtUtc: action.auth.accessTokenExpiresAtUtc,
        endedSession: null,
        sessionCheckFailed: false,
      };
    case 'checking':
      return { ...state, status: 'initializing', sessionCheckFailed: false };
    case 'checkFailed':
      return { ...state, sessionCheckFailed: true };
    case 'ended':
      return {
        status: 'anonymous',
        user: null,
        accessTokenExpiresAtUtc: null,
        endedSession: action.ended,
        sessionCheckFailed: false,
      };
    case 'profileLoaded':
      return { ...state, user: action.user };
  }
}

function initialState(initialUser: UserProfile | null): SessionState {
  let status: AuthStatus = 'anonymous';
  if (initialUser) status = 'authenticated';
  else if (getRefreshToken()) status = 'initializing'; // a stored session to restore
  return {
    status,
    user: initialUser,
    accessTokenExpiresAtUtc: getAccessTokenExpiresAtUtc(),
    endedSession: null,
    sessionCheckFailed: false,
  };
}

interface AuthProviderProps {
  children: ReactNode;
  /** Test seam: start signed in without a session check. Not used by the running app. */
  initialUser?: UserProfile | null;
}

/**
 * Owns the session (docs/01 §14.3, docs/07):
 *   startup      stored refresh token → silent refresh → signed in (or "session expired")
 *   refresh      any successful refresh (interceptor, timer, startup) updates the user here
 *   expiry       the server rejects the refresh token → signed out with a returnUrl and a notice
 *   proactive    refresh ~60 s before the access token expires
 *   other tabs   signed out elsewhere → sign out here; signed in elsewhere → restore here
 */
export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(sessionReducer, initialUser, initialState);

  // Listeners are registered once; they read the CURRENT state through this ref.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const endSession = useCallback(
    (ended: EndedSession) => {
      dispatch({ type: 'ended', ended });
      queryClient.clear(); // the next person on this browser must not see cached data
    },
    [queryClient],
  );

  /** Startup / retry / "signed in in another tab": silent refresh with the stored token. */
  const runSessionCheck = useCallback(() => {
    dispatch({ type: 'checking' });
    refreshSession().catch((error: unknown) => {
      // 401 → onSessionExpired already handled it. Anything else (offline, 5xx): keep the session
      // and let the user retry instead of throwing them out.
      if (toApiError(error).kind !== 'unauthorized') {
        dispatch({ type: 'checkFailed' });
      }
    });
  }, []);

  // 1. Session events from outside React (interceptor, timer, startup).
  useEffect(() => {
    const offRefreshed = onSessionRefreshed((auth) => {
      dispatch({ type: 'signedIn', auth });
    });
    const offExpired = onSessionExpired(() => {
      if (stateRef.current.status !== 'anonymous') {
        endSession({ notice: 'sessionExpired', keepReturnUrl: true });
      }
    });
    return () => {
      offRefreshed();
      offExpired();
    };
  }, [endSession]);

  // 2. Restore a stored session once at startup (React StrictMode-safe: refreshSession is single-flight).
  const startupCheckDone = useRef(false);
  useEffect(() => {
    if (startupCheckDone.current) return;
    startupCheckDone.current = true;
    if (stateRef.current.status === 'initializing') {
      runSessionCheck();
    }
  }, [runSessionCheck]);

  // 3. Other tabs of this browser.
  useEffect(
    () =>
      onOtherTabSessionChange((change) => {
        const { status } = stateRef.current;
        if (change === 'signedOutElsewhere' && status !== 'anonymous') {
          clearAccessToken(); // storage is already empty
          endSession({ notice: 'signedOutElsewhere' });
        } else if (change === 'signedInElsewhere' && status === 'anonymous') {
          runSessionCheck();
        }
        // 'rotatedElsewhere': nothing to do; the newest token is read from storage when needed.
      }),
    [endSession, runSessionCheck],
  );

  // 4. Proactive refresh shortly before the access token expires.
  useEffect(() => {
    if (state.status !== 'authenticated') return undefined;
    const delay = computeRefreshDelay(state.accessTokenExpiresAtUtc);
    if (delay === null) return undefined;
    const timer = window.setTimeout(
      () => {
        refreshSession().catch(() => undefined); // expiry is handled by onSessionExpired
      },
      Math.max(delay, MIN_PROACTIVE_REFRESH_MS),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [state.status, state.accessTokenExpiresAtUtc]);

  const completeSignIn = useCallback((auth: AuthResponse) => {
    setSession(auth);
    dispatch({ type: 'signedIn', auth });
  }, []);

  const signOut = useCallback(
    (options: EndedSession = {}) => {
      const refreshToken = getRefreshToken();

      // 1. Locally, immediately: the UI must never wait for the network to sign someone out.
      //    Other tabs see the storage change and sign out too; RequireAuth navigates.
      clearSession();
      endSession(options);

      // 2. On the server, best effort: revoke the refresh token. Failure is harmless here
      //    (the token expires anyway, and it's no longer stored in this browser).
      if (refreshToken) {
        void authApi.logout({ refreshToken }).catch(() => undefined);
      }
      return Promise.resolve();
    },
    [endSession],
  );

  const refreshProfile = useCallback(async () => {
    dispatch({ type: 'profileLoaded', user: await authApi.me() });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      endedSession: state.endedSession,
      sessionCheckFailed: state.sessionCheckFailed,
      retrySessionCheck: runSessionCheck,
      completeSignIn,
      signOut,
      refreshProfile,
    }),
    [state, runSessionCheck, completeSignIn, signOut, refreshProfile],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
