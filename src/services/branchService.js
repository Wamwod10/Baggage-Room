import apiClient from "./apiClient";
import { BRANCH_NAME_BY_CODE, setRuntimeBranches } from "../utils/branches";

let branchCache = null;

const mapBranch = (branch) => ({
  ...branch,
  displayName: BRANCH_NAME_BY_CODE[branch.code] || branch.name,
});

const getAll = async ({ force = false } = {}) => {
  if (branchCache && !force) return branchCache;
  const response = await apiClient.get("/branches");
  branchCache = (response.data || []).map(mapBranch);
  setRuntimeBranches(branchCache);
  return branchCache;
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
  setRuntimeBranches([]);
};

export const branchNameByCode = BRANCH_NAME_BY_CODE;
export default { getAll, getBranchIdByName, getBranchName, clearCache };
