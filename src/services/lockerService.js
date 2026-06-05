import { getLockers, updateLocker, LOCKER_STATUSES } from "../utils/storage";

const lockerService = {
  statuses: LOCKER_STATUSES,

  getAll(branchName = null) {
    return getLockers(branchName);
  },

  block(branch, number, data = {}) {
    return updateLocker(branch, number, {
      status: LOCKER_STATUSES.SERVICE,
      serviceReason: data.reason || "",
      admin: data.admin,
    });
  },

  unblock(branch, number, data = {}) {
    return updateLocker(branch, number, {
      status: LOCKER_STATUSES.FREE,
      serviceReason: "",
      admin: data.admin,
    });
  },
};

export default lockerService;
