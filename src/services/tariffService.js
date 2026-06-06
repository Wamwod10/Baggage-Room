import settingsService from "./settingsService";

const tariffService = {
  getAll: settingsService.getTariffs.bind(settingsService),
  update: settingsService.updateTariff.bind(settingsService),
};

export default tariffService;
