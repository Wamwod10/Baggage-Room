import {
  getShifts,
  getCurrentShift,
  openShift,
  closeShift,
} from "../utils/storage";

const shiftService = {
  getAll(branchName = null) {
    return getShifts(branchName);
  },

  getCurrent(branchName = null) {
    return getCurrentShift(branchName);
  },

  open(data) {
    return openShift(data);
  },

  close(branchName, data) {
    return closeShift(branchName, data);
  },

  isOpen(branchName = null) {
    return Boolean(getCurrentShift(branchName));
  },
};

export default shiftService;
