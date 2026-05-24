import { getExpenses, createExpense, deleteExpense } from "../utils/storage";

const expenseService = {
  getAll(branchName = null) {
    return getExpenses(branchName);
  },

  create(data) {
    return createExpense(data);
  },

  delete(id) {
    return deleteExpense(id);
  },
};

export default expenseService;
