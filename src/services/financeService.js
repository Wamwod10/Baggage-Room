import {
  createInkassa,
  getCashMovements,
  getInkassa,
} from "../utils/storage";

const financeService = {
  getCashMovements(branchName = null) {
    return getCashMovements(branchName);
  },

  getInkassa(branchName = null) {
    return getInkassa(branchName);
  },

  createInkassa(data) {
    return createInkassa(data);
  },
};

export default financeService;
