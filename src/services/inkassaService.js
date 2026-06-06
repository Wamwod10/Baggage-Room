import financeService from "./financeService";

const inkassaService = {
  getAll: financeService.getInkassa.bind(financeService),
  create: financeService.createInkassa.bind(financeService),
};

export default inkassaService;
