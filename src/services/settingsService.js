import { getSettings, saveSettings } from "../utils/storage";

const settingsService = {
  get() {
    return getSettings();
  },

  save(data) {
    return saveSettings(data);
  },
};

export default settingsService;