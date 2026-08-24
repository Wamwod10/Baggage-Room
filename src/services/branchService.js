import apiClient, { getAuthContextKey } from "./apiClient";
import { BRANCH_NAME_BY_CODE, setRuntimeBranches } from "../utils/branches";

let branchCache = null;
let branchRequest = null;

const mapBranch = (branch) => ({
  ...branch,
  displayName: BRANCH_NAME_BY_CODE[branch.code] || branch.name,
});
const getArrayData = (payload) => (Array.isArray(payload?.data) ? payload.data : []);

const getAll = async ({ force = false } = {}) => {
  const contextKey = getAuthContextKey();
  if (branchCache?.contextKey === contextKey && !force) return branchCache.value;
  if (branchRequest?.contextKey === contextKey && !force) return branchRequest.promise;

  const request = apiClient.get("/branches").then((response) => {
    const value = getArrayData(response).map(mapBranch);
    if (getAuthContextKey() === contextKey) {
      branchCache = { contextKey, value };
      setRuntimeBranches(value);
    }
    return value;
  }).finally(() => {
    if (branchRequest?.promise === request) branchRequest = null;
  });
  branchRequest = { contextKey, promise: request };

  return request;
};

const getBranchIdByName = async (branchName) => {
  if (!branchName) return undefined;
  const branches = await getAll();
  return branches.find((branch) => branch.displayName === branchName || branch.name === branchName)?.id;
};

const getBranchName = (branch) => {
  if (!branch) return "";
  return branch.displayName || BRANCH_NAME_BY_CODE[branch.code] || branch.name || "";
};

const clearCache = () => {
  branchCache = null;
  branchRequest = null;
  setRuntimeBranches([]);
};

export const branchNameByCode = BRANCH_NAME_BY_CODE;
export default { getAll, getBranchIdByName, getBranchName, clearCache };
