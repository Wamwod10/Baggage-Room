/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import authService from "../services/authService";
import { AUTH_EVENT } from "../services/apiClient";
import branchService from "../services/branchService";
import { ALL_BRANCHES_LABEL, getBranchNames } from "../utils/branches";

const AuthContext = createContext(null);
const ACTIVE_BRANCH_KEY = "br_active_branch";

const getSavedActiveBranch = () => {
  const savedBranch = (() => {
    try {
      return localStorage.getItem(ACTIVE_BRANCH_KEY);
    } catch {
      return null;
    }
  })();
  const allowedBranches = [ALL_BRANCHES_LABEL, ...getBranchNames()];

  return allowedBranches.includes(savedBranch)
    ? savedBranch
    : ALL_BRANCHES_LABEL;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    authService.getToken() ? authService.getUser() : null,
  );
  const [authLoading, setAuthLoading] = useState(() =>
    Boolean(authService.getToken()),
  );
  const [activeBranch, setActiveBranchState] = useState(getSavedActiveBranch);
  const [branchVersion, setBranchVersion] = useState(0);

  const hydrateBranches = useCallback(async () => {
    try {
      await branchService.getAll({ force: true });
      return true;
    } catch (error) {
      console.warn("Branch list could not be refreshed; keeping authenticated session", error);
      return false;
    } finally {
      setBranchVersion((value) => value + 1);
    }
  }, []);

  const applyUser = useCallback((nextUser) => {
    setUser(nextUser);

    if (nextUser?.role === "SUPER_ADMIN") {
      const savedActiveBranch = getSavedActiveBranch();
      localStorage.setItem(ACTIVE_BRANCH_KEY, savedActiveBranch);
      setActiveBranchState(savedActiveBranch);
    } else {
      localStorage.removeItem(ACTIVE_BRANCH_KEY);
      setActiveBranchState(ALL_BRANCHES_LABEL);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
    setActiveBranchState(ALL_BRANCHES_LABEL);
    setUser(null);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!authService.getToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const currentUser = await authService.me();
        if (!cancelled) applyUser(currentUser);
        await hydrateBranches();
      } catch (error) {
        if (!cancelled && error?.status === 401) logout();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applyUser, hydrateBranches, logout]);

  useEffect(() => {
    window.addEventListener(AUTH_EVENT, logout);
    return () => window.removeEventListener(AUTH_EVENT, logout);
  }, [logout]);

  const login = useCallback(async ({ username, password }) => {
    try {
      const { user: authenticatedUser } = await authService.login(
        username,
        password,
      );
      await hydrateBranches();
      applyUser(authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      throw new Error(error.message || "Login yoki parol noto'g'ri", {
        cause: error,
      });
    }
  }, [applyUser, hydrateBranches]);

  const setActiveBranch = useCallback((branchName) => {
    const allowedBranches = [ALL_BRANCHES_LABEL, ...getBranchNames()];
    const nextBranch = allowedBranches.includes(branchName)
      ? branchName
      : ALL_BRANCHES_LABEL;

    localStorage.setItem(ACTIVE_BRANCH_KEY, nextBranch);
    setActiveBranchState(nextBranch);
  }, []);

  const effectiveBranch =
    user?.role === "BRANCH_ADMIN"
      ? user.branchName
      : activeBranch === ALL_BRANCHES_LABEL
        ? null
        : activeBranch;

  const value = useMemo(
    () => ({
      user,
      activeBranch,
      effectiveBranch,
      authLoading,
      isAuth: Boolean(user),
      isSuperAdmin: user?.role === "SUPER_ADMIN",
      isBranchAdmin: user?.role === "BRANCH_ADMIN",
      login,
      logout,
      setActiveBranch,
      branchVersion,
    }),
    [
      activeBranch,
      authLoading,
      branchVersion,
      effectiveBranch,
      login,
      logout,
      setActiveBranch,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
