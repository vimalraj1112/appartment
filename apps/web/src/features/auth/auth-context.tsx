import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { configureRefresh, setAccessToken } from "../../lib/api";
import { connectSocket, disconnectSocket } from "../realtime/socket";
import { loginRequest, logoutRequest, refreshRequest, type AuthUser } from "./auth-api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const inFlight = useRef<Promise<string> | null>(null);

  const runRefresh = useCallback(async (): Promise<string> => {
    if (inFlight.current) return inFlight.current;

    const promise = refreshRequest()
      .then(({ user: nextUser, accessToken }) => {
        setAccessToken(accessToken);
        setUser(nextUser);
        setStatus("authenticated");
        return accessToken;
      })
      .catch((error: unknown) => {
        setAccessToken(null);
        setUser(null);
        setStatus("anonymous");
        throw error;
      })
      .finally(() => {
        inFlight.current = null;
      });

    inFlight.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    configureRefresh(runRefresh);
    void runRefresh().catch(() => undefined);
  }, [runRefresh]);

  useEffect(() => {
    if (status === "authenticated") {
      connectSocket();
    } else if (status === "anonymous") {
      disconnectSocket();
    }
  }, [status]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { user: nextUser, accessToken } = await loginRequest(email, password);
    setAccessToken(accessToken);
    setUser(nextUser);
    setStatus("authenticated");
    return nextUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      login,
      logout,
      refresh: runRefresh,
    }),
    [user, status, login, logout, runRefresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
