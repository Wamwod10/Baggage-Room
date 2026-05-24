/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import { ALL_BRANCHES_LABEL, getBranchNames } from "../utils/branches";

const AuthContext = createContext(null);
const ACTIVE_BRANCH_KEY = "br_active_branch";

const USERS = [
  {
    username: "rahbariyat",
    password: "admin123",
    role: "SUPER_ADMIN",
    fullName: "Rahbariyat",
    branchName: ALL_BRANCHES_LABEL,
  },
  {
    username: "tashkent_airport",
    password: "12345",
    role: "BRANCH_ADMIN",
    fullName: "Toshkent xalqaro aeroport",
    branchName: "Toshkent xalqaro aeroport",
  },
  {
    username: "tashkent_north",
    password: "12345",
    role: "BRANCH_ADMIN",
    fullName: "Toshkent Shimoliy vokzal",
    branchName: "Toshkent Shimoliy vokzal",
  },
  {
    username: "tashkent_south",
    password: "12345",
    role: "BRANCH_ADMIN",
    fullName: "Toshkent Janubiy vokzal",
    branchName: "Toshkent Janubiy vokzal",
  },
  {
    username: "samarkand_station",
    password: "12345",
    role: "BRANCH_ADMIN",
    fullName: "Samarqand vokzal",
    branchName: "Samarqand vokzal",
  },
  {
    username: "samarkand_airport",
    password: "12345",
    role: "BRANCH_ADMIN",
    fullName: "Samarqand xalqaro aeroport",
    branchName: "Samarqand xalqaro aeroport",
  },
];

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
  const [user, setUser] = useState(() => {
    let savedUser = null;

    try {
      const saved = localStorage.getItem("br_user");
      savedUser = saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem("br_user");
      return null;
    }

    if (!savedUser) return null;

    const canonicalUser = USERS.find(
      (item) => item.username === savedUser?.username,
    );

    if (canonicalUser) {
      localStorage.setItem("br_user", JSON.stringify(canonicalUser));
      return canonicalUser;
    }

    return savedUser;
  });
  const [activeBranch, setActiveBranchState] = useState(getSavedActiveBranch);

  const login = ({ username, password }) => {
    const foundUser = USERS.find(
      (item) => item.username === username && item.password === password,
    );

    if (!foundUser) {
      throw new Error("Login yoki parol noto'g'ri");
    }

    localStorage.setItem("br_user", JSON.stringify(foundUser));

    if (foundUser.role === "SUPER_ADMIN") {
      const savedActiveBranch = getSavedActiveBranch();
      localStorage.setItem(ACTIVE_BRANCH_KEY, savedActiveBranch);
      setActiveBranchState(savedActiveBranch);
    } else {
      localStorage.removeItem(ACTIVE_BRANCH_KEY);
      setActiveBranchState(ALL_BRANCHES_LABEL);
    }

    setUser(foundUser);
    return foundUser;
  };

  const logout = () => {
    localStorage.removeItem("br_user");
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
    setActiveBranchState(ALL_BRANCHES_LABEL);
    setUser(null);
  };

  const setActiveBranch = (branchName) => {
    const allowedBranches = [ALL_BRANCHES_LABEL, ...getBranchNames()];
    const nextBranch = allowedBranches.includes(branchName)
      ? branchName
      : ALL_BRANCHES_LABEL;

    localStorage.setItem(ACTIVE_BRANCH_KEY, nextBranch);
    setActiveBranchState(nextBranch);
  };

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
      isAuth: Boolean(user),
      isSuperAdmin: user?.role === "SUPER_ADMIN",
      isBranchAdmin: user?.role === "BRANCH_ADMIN",
      login,
      logout,
      setActiveBranch,
    }),
    [activeBranch, effectiveBranch, user],
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
