export const ALL_BRANCHES_LABEL = "Barcha filiallar";

export const BRANCHES = [
  {
    name: "Toshkent xalqaro aeroport",
    shiftType: "12h",
    shifts: [
      { label: "09:00 - 21:00", start: "09:00", end: "21:00" },
      { label: "21:00 - 09:00", start: "21:00", end: "09:00" },
    ],
  },
  {
    name: "Toshkent Shimoliy vokzal",
    shiftType: "24h",
    shifts: [{ label: "09:00 - 09:00", start: "09:00", end: "09:00" }],
  },
  {
    name: "Toshkent Janubiy vokzal",
    shiftType: "24h",
    shifts: [{ label: "09:00 - 09:00", start: "09:00", end: "09:00" }],
  },
  {
    name: "Samarqand vokzal",
    shiftType: "24h",
    shifts: [{ label: "09:00 - 09:00", start: "09:00", end: "09:00" }],
  },
  {
    name: "Samarqand xalqaro aeroport",
    shiftType: "12h",
    shifts: [
      { label: "09:00 - 21:00", start: "09:00", end: "21:00" },
      { label: "21:00 - 09:00", start: "21:00", end: "09:00" },
    ],
  },
];

export const getBranchNames = () => BRANCHES.map((branch) => branch.name);

export const isKnownBranch = (branchName) =>
  getBranchNames().includes(branchName);

export const getBranchByName = (branchName) =>
  BRANCHES.find((branch) => branch.name === branchName);
