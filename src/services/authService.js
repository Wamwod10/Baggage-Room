import apiClient, { TOKEN_KEY } from "./apiClient";
import { ALL_BRANCHES_LABEL, BRANCH_NAME_BY_CODE } from "../utils/branches";
import { getData } from "./apiMappers";

const USER_KEY = "br_user";

const normalizeUser = (user) => {
  if (!user) return null;

  const branchName =
    BRANCH_NAME_BY_CODE[user.branch?.code] ||
    user.branchName ||
    user.branch?.name ||
    ALL_BRANCHES_LABEL;

  return {
    id: user.id,
    username: user.login || user.username,
    login: user.login || user.username,
    role: user.role,
    fullName: user.name || user.fullName || user.login || user.username,
    branchId: user.branchId || user.branch?.id || null,
    branchName: user.role === "SUPER_ADMIN" ? ALL_BRANCHES_LABEL : branchName,
    branch: user.branch || null,
    isActive: user.isActive,
  };
};

const getToken = () => localStorage.getItem(TOKEN_KEY);

const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const getUser = () => {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

const setUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

const login = async (loginName, password) => {
  const response = await apiClient.post("/auth/login", {
    login: loginName,
    password,
  });
  const data = getData(response, {});
  const token = data.token;
  const user = normalizeUser(data.user);

  setToken(token);
  setUser(user);

  return { token, user };
};

const me = async () => {
  const response = await apiClient.get("/auth/me");
  const user = normalizeUser(getData(response));
  setUser(user);
  return user;
};

const logout = () => {
  setToken(null);
  setUser(null);
};

export default {
  login,
  me,
  logout,
  getToken,
  setToken,
  getUser,
};
