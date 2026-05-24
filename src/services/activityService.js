import { getActivityLogs, addActivityLog } from "../utils/storage";

const activityService = {
  getAll(branchName = null) {
    return getActivityLogs(branchName);
  },

  create(data) {
    return addActivityLog(data);
  },
};

export default activityService;
