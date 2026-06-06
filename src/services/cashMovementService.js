import financeService from "./financeService";

const cashMovementService = {
  getAll: financeService.getCashMovements.bind(financeService),
};

export default cashMovementService;
