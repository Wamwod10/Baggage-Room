export const ALL_BRANCHES_LABEL = "Barcha filiallar";

export const BRANCH_NAME_BY_CODE = {
  TIA: "Toshkent xalqaro aeroport",
  TSV: "Toshkent Shimoliy vokzal",
  TJV: "Toshkent Janubiy vokzal",
  SVK: "Samarqand vokzal",
  SIA: "Samarqand xalqaro aeroport",
};

const DEFAULT_SHIFTS = {
  "12h": [
    { label: "09:00 - 21:00", start: "09:00", end: "21:00" },
    { label: "21:00 - 09:00", start: "21:00", end: "09:00" },
  ],
  "24h": [{ label: "09:00 - 09:00", start: "09:00", end: "09:00" }],
};

const getShiftTypeByBranchName = (branchName = "") =>
  branchName.toLowerCase().includes("aeroport") ? "12h" : "24h";

const normalizeBranch = (branch) => {
  const name =
    branch.displayName ||
    BRANCH_NAME_BY_CODE[branch.code] ||
    branch.name ||
    "";
  const shiftType = branch.shiftType || getShiftTypeByBranchName(name);

  return {
    ...branch,
    name,
    displayName: name,
    shiftType,
    shifts: branch.shifts || DEFAULT_SHIFTS[shiftType] || DEFAULT_SHIFTS["24h"],
  };
};

export const BRANCHES = [
  {
    name: "Toshkent xalqaro aeroport",
    shiftType: "12h",
    shifts: DEFAULT_SHIFTS["12h"],
  },
  {
    name: "Toshkent Shimoliy vokzal",
    shiftType: "24h",
    shifts: DEFAULT_SHIFTS["24h"],
  },
  {
    name: "Toshkent Janubiy vokzal",
    shiftType: "24h",
    shifts: DEFAULT_SHIFTS["24h"],
  },
  {
    name: "Samarqand vokzal",
    shiftType: "24h",
    shifts: DEFAULT_SHIFTS["24h"],
  },
  {
    name: "Samarqand xalqaro aeroport",
    shiftType: "12h",
    shifts: DEFAULT_SHIFTS["12h"],
  },
].map(normalizeBranch);

let runtimeBranches = BRANCHES;

export const setRuntimeBranches = (branches = []) => {
  runtimeBranches = branches.length ? branches.map(normalizeBranch) : BRANCHES;
  return runtimeBranches;
};

export const getBranches = () => runtimeBranches;

export const getBranchNames = () => getBranches().map((branch) => branch.name);

export const isKnownBranch = (branchName) =>
  getBranchNames().includes(branchName);

export const getBranchByName = (branchName) =>
  getBranches().find((branch) => branch.name === branchName);
