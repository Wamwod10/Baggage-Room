import { useEffect, useState } from "react";
import {
  Save,
  Settings as SettingsIcon,
  Send,
  Bell,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import settingsService from "../../services/settingsService";
import telegramService from "../../services/telegramService";
import branchService from "../../services/branchService";
import exportService from "../../services/exportService";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import GlassSelect from "../../components/GlassSelect/GlassSelect";
import usePageResource from "../../hooks/usePageResource";
import { LANGUAGE_OPTIONS, normalizeLanguage } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";
import { useAuth } from "../../store/AuthContext";
import { getBranchNames } from "../../utils/branches";
import { cleanNumericInput, formatNumberInput } from "../../utils/inputFormat";
import "./settings.scss";

const fallbackSettings = {
  language: "uzLatn",
  theme: "light",
  pricing: {
    Small: 0,
    Medium: 0,
    Large: 0,
    XL: 0,
  },
  overtimePerHour: 0,
  branchTariffs: {},
  currencies: ["UZS", "USD", "RUB", "EUR"],
  defaultCurrency: "UZS",
  printer: {
    paperWidth: "80mm",
    logoEnabled: true,
    logoSrc: "/1.jpg",
  },
  googleSheets: {
    enabled: false,
    endpoint: "",
  },
  exportCenter: {
    orders: true,
    shifts: true,
    finance: true,
    analytics: true,
  },
  telegram: {
    botToken: "",
    groupId: "",
    enabled: false,
    newOrder: false,
    shiftOpened: false,
    shiftClosed: false,
    orderCancelled: false,
    delayedBaggage: false,
    overtimePayment: false,
    debtClosed: false,
    inkassa: false,
    expenseAlerts: false,
    orderEdit: false,
    lockerTransfer: false,
    lockerBlock: false,
    groups: {},
  },
};

const tariffHours = [1, 12, 24, 48, 72];
const telegramEventLabels = [
  ["newOrder", "Yangi buyurtma xabari"],
  ["shiftOpened", "Kassa ochilganda xabar"],
  ["shiftClosed", "Smena yopilganda hisobot"],
  ["orderCancelled", "Buyurtma bekor qilinganda xabar"],
  ["delayedBaggage", "Kechikkan bagaj ogohlantirishi"],
  ["overtimePayment", "Kechikish to'lovi"],
  ["debtClosed", "Qarz yopildi"],
  ["inkassa", "Inkassa"],
  ["expenseAlerts", "Xarajat ogohlantirishlari"],
  ["orderEdit", "Buyurtmani tahrirlash"],
  ["lockerTransfer", "Yacheykani ko'chirish"],
  ["lockerBlock", "Yacheykani servisga olish"],
];
const telegramEventBackendFields = {
  newOrder: "newOrderEnabled",
  shiftOpened: "shiftOpenEnabled",
  shiftClosed: "shiftCloseEnabled",
  orderCancelled: "orderCancelEnabled",
  delayedBaggage: "delayedBaggageEnabled",
  overtimePayment: "overtimePaymentEnabled",
  debtClosed: "debtClosedEnabled",
  inkassa: "inkassaEnabled",
  expenseAlerts: "expenseEnabled",
  orderEdit: "orderEditEnabled",
  lockerTransfer: "lockerTransferEnabled",
  lockerBlock: "lockerServiceEnabled",
};
const exportLabels = {
  orders: "Buyurtmalar",
  shifts: "Smenalar",
  finance: "Moliya",
  analytics: "Analitika",
};
const XL_BRANCHES = new Set([
  "Toshkent Shimoliy vokzal",
  "Toshkent Janubiy vokzal",
  "Samarqand vokzal",
]);
const tariffSizesForBranch = (branch) => ["S", "M", "L", ...(XL_BRANCHES.has(branch) ? ["XL"] : [])];
const buildTelegramStateFromBackend = (telegramSettings = [], previousTelegram = {}) => {
  const groups = {};
  for (const item of telegramSettings) {
    const branch = branchService.getBranchName(item.branch);
    groups[branch] = {
      branchId: item.branchId,
      token: item.botToken || "",
      groupId: item.groupId || "",
      enabled: item.enabled === true,
    };
  }

  const events = {};
  const anyEventEnabled = telegramSettings.some((item) =>
    Object.values(telegramEventBackendFields).some((backendKey) => item?.[backendKey] !== false),
  );
  for (const [frontendKey, backendKey] of Object.entries(telegramEventBackendFields)) {
    events[frontendKey] = telegramSettings.length
      ? !anyEventEnabled || telegramSettings.some((item) => item?.[backendKey] !== false)
      : Boolean(previousTelegram?.[frontendKey]);
  }

  return {
    ...previousTelegram,
    ...events,
    groups,
    enabled: telegramSettings.some((item) => item.enabled === true),
  };
};

const buildTelegramPayload = (telegram = {}, group = {}) => ({
  botToken: group.token || telegram.botToken || "",
  groupId: group.groupId || telegram.groupId || "",
  enabled: Boolean(telegram.enabled && group.enabled !== false),
  newOrderEnabled: Boolean(telegram.newOrder),
  shiftOpenEnabled: Boolean(telegram.shiftOpened),
  shiftCloseEnabled: Boolean(telegram.shiftClosed),
  orderCancelEnabled: Boolean(telegram.orderCancelled),
  delayedBaggageEnabled: Boolean(telegram.delayedBaggage),
  overtimePaymentEnabled: Boolean(telegram.overtimePayment),
  debtClosedEnabled: Boolean(telegram.debtClosed),
  inkassaEnabled: Boolean(telegram.inkassa),
  expenseEnabled: Boolean(telegram.expenseAlerts),
  orderEditEnabled: Boolean(telegram.orderEdit),
  lockerTransferEnabled: Boolean(telegram.lockerTransfer),
  lockerServiceEnabled: Boolean(telegram.lockerBlock),
});

export default function Settings() {
  const { t, language, setLanguage } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const branchNames = getBranchNames();
  const [settings, setSettings] = useState(fallbackSettings);
  const [message, setMessage] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const {
    data: loadedSettings,
    isLoading,
    error,
    retry,
  } = usePageResource(() => settingsService.get(), [], fallbackSettings);
  const [apiBranches, setApiBranches] = useState([]);

  useEffect(() => {
    if (loadedSettings && !error) {
      const timer = window.setTimeout(() => {
        setSettings({
          ...loadedSettings,
          language: normalizeLanguage(loadedSettings.language),
        });
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [loadedSettings, error]);

  useEffect(() => {
    let active = true;

    Promise.all([
      branchService.getAll(),
      settingsService.getTariffs(),
      telegramService.getSettings(),
    ])
      .then(([branches, tariffs, telegramSettings]) => {
        if (!active) return;
        setApiBranches(branches);

        const branchTariffs = {};
        for (const tariff of tariffs) {
          branchTariffs[tariff.branch] = branchTariffs[tariff.branch] || { sizes: {} };
          branchTariffs[tariff.branch].sizes[tariff.size] = {
            id: tariff.id,
            1: tariff.price1h,
            12: tariff.price12h,
            24: tariff.price24h,
            48: tariff.price48h,
            72: tariff.price72h,
            after72: tariff.after72hPrice,
          };
        }

        setSettings((prev) => ({
          ...prev,
          branchTariffs,
          telegram: buildTelegramStateFromBackend(telegramSettings, prev.telegram),
        }));
      })
      .catch(() => {
        if (active) setMessage(t("Backend settings yuklanmadi"));
      });

    return () => {
      active = false;
    };
  }, [t]);

  const handleTelegramChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        [key]: value,
      },
    }));
  };

  const handleBranchTariffChange = (branch, size, key, value) => {
    const amount = Number(cleanNumericInput(value) || 0);

    if (!Number.isFinite(amount) || amount < 0) {
      setMessage(t("Tarif qiymati manfiy bo'lishi mumkin emas."));
      return;
    }

    setSettings((prev) => ({
      ...prev,
      branchTariffs: {
        ...prev.branchTariffs,
        [branch]: {
          ...(prev.branchTariffs?.[branch] || {}),
          sizes: {
            ...(prev.branchTariffs?.[branch]?.sizes || {}),
            [size]: {
              ...(prev.branchTariffs?.[branch]?.sizes?.[size] || {}),
              [key]: amount,
            },
          },
        },
      },
    }));
  };

  const handleTelegramGroupChange = (branch, key, value) => {
    setSettings((prev) => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        groups: {
          ...(prev.telegram?.groups || {}),
          [branch]: {
            ...(prev.telegram?.groups?.[branch] || {}),
            [key]: value,
          },
        },
      },
    }));
  };

  const handleThemeChange = (theme) => {
    setSettings((prev) => ({
      ...prev,
      theme,
    }));

    document.body.classList.toggle("dark", theme === "dark");
  };

  const handleLanguageChange = (nextLanguage) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);

    setSettings((prev) => ({
      ...prev,
      language: normalizedLanguage,
    }));
    setLanguage(normalizedLanguage);
  };

  const handleSave = async () => {
    if (
      !Number.isFinite(Number(settings.overtimePerHour)) ||
      Number(settings.overtimePerHour) < 0
    ) {
      setMessage(t("Overtime narxi manfiy bo'lmasligi kerak."));
      return;
    }

    if (settings.telegram?.enabled) {
      const hasBranchGroup = Object.values(settings.telegram?.groups || {}).some(
        (group) => group?.enabled !== false && group?.token?.trim() && group?.groupId?.trim(),
      );

      if (
        !hasBranchGroup &&
        (!settings.telegram?.botToken?.trim() ||
          !settings.telegram?.groupId?.trim())
      ) {
        setMessage(
          t("Telegram yoqilgan bo'lsa, Bot token va Group ID majburiy."),
        );
        return;
      }
    }

    try {
      const tariffUpdates = [];
      for (const [, tariff] of Object.entries(settings.branchTariffs || {})) {
        for (const [, values] of Object.entries(tariff.sizes || {})) {
          if (!values.id) continue;
          tariffUpdates.push(
            settingsService.updateTariff(values.id, {
              price1h: Number(values[1] || 0),
              price12h: Number(values[12] || 0),
              price24h: Number(values[24] || 0),
              price48h: Number(values[48] || 0),
              price72h: Number(values[72] || 0),
              after72hPrice: Number(values.after72 || 0),
            }),
          );
        }
      }

      const telegramUpdates = apiBranches.map((apiBranch) => {
        const branch = branchService.getBranchName(apiBranch);
        const group = settings.telegram?.groups?.[branch] || {};
        return telegramService.updateSettings(apiBranch.id, buildTelegramPayload(settings.telegram, group));
      });

      await Promise.all([...tariffUpdates, ...telegramUpdates]);

      const savedSettings = settingsService.save({
        ...settings,
        language: normalizeLanguage(settings.language),
      });
      setLanguage(savedSettings.language);

      // Refetch Telegram settings from backend to ensure frontend reflects persisted values
      try {
        const telegramSettings = await telegramService.getSettings();
        setSettings((prev) => ({
          ...prev,
          telegram: buildTelegramStateFromBackend(telegramSettings, prev.telegram),
        }));
      } catch (err) {
        // If fetching fails, keep current settings and show a message
        // Do not overwrite enabled=false from backend with frontend defaults
        console.warn("Refetching telegram settings failed", err);
      }

      setMessage(t("Settings saqlandi"));
    } catch (error) {
      setMessage(t(error.message || "Settings saqlashda xatolik yuz berdi."));
    }
  };

  const handleTestTelegram = async () => {
    const globalToken = settings.telegram?.botToken?.trim();
    const globalGroupId = settings.telegram?.groupId?.trim();
    const target = apiBranches
      .map((apiBranch) => {
        const branch = branchService.getBranchName(apiBranch);
        const group = settings.telegram?.groups?.[branch] || {};
        return {
          apiBranch,
          group,
          token: (group.token || globalToken || "").trim(),
          groupId: (group.groupId || globalGroupId || "").trim(),
        };
      })
      .find((item) => item.token && item.groupId);

    if (!target) {
      setTestStatus(t("Bot token va Group ID kiritilishi kerak"));
      return;
    }

    setTestStatus(t("Test xabar yuborilmoqda..."));

    try {
      await telegramService.updateSettings(target.apiBranch.id, {
        ...buildTelegramPayload(settings.telegram, target.group),
        botToken: target.token,
        groupId: target.groupId,
        enabled: true,
      });
      await telegramService.test(target.apiBranch.id);

      setTestStatus(t("Test xabar Telegram groupga yuborildi"));
    } catch (error) {
      setTestStatus(t(error.message || "Telegram bilan ulanishda xatolik yuz berdi"));
    }
  };

  const handleResetData = async () => {
    if (resetPending || resetConfirmText !== "RESET") return;

    const approved = window.confirm(t("Hamma order, smena, kassa va tarix ma'lumotlari o'chiriladi. Davom etasizmi?"));
    if (!approved) return;

    setResetPending(true);
    setMessage("");

    try {
      const result = await settingsService.resetData(resetConfirmText);
      setResetConfirmText("");
      setMessage(
        `${t("Data reset qilindi")}: ${Number(result?.after?.orders || 0)} ${t("order")}, ${Number(result?.after?.shifts || 0)} ${t("shift")}`,
      );
    } catch (error) {
      setMessage(t(error.message || "Data reset qilishda xatolik yuz berdi."));
    } finally {
      setResetPending(false);
    }
  };

  return (
    <section className="page settings-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Settings")}</h1>
          <p>
            {t("Filial tariflari, Telegram va system sozlamalari")}
          </p>
        </div>

        <button className="settings-save-btn" onClick={handleSave}>
          <Save size={16} />
          {t("Save")}
        </button>
      </div>

      {error && (
        <StateBlock
          type="error"
          title={t("Settings yuklanmadi")}
          description={t(
            "Sozlamalarni o'qishda xatolik yuz berdi. LocalStorage ma'lumotlarini tekshiring.",
          )}
          actionLabel={t("Qayta urinish")}
          onAction={retry}
        />
      )}

      {message && <div className="settings-message">{message}</div>}

      {isLoading && !error ? (
        <div className="settings-card card">
          <ListSkeleton rows={5} />
        </div>
      ) : (
        !error && (
          <div className="settings-grid">
            <div className="settings-card settings-card--tariffs card">
              <div className="settings-title">
                <SettingsIcon size={18} />
                <h2>{t("Filial tariflari")}</h2>
              </div>

              <div className="branch-settings-list">
                {branchNames.map((branch) => {
                  const tariff = settings.branchTariffs?.[branch] || {};
                  const tariffSizes = tariffSizesForBranch(branch);

                  return (
                    <div className="branch-tariff-card" key={branch}>
                      <div className="branch-tariff-head">
                        <h3>{t(branch)}</h3>
                        <span>{tariffSizes.join(" / ")}</span>
                      </div>

                      <div className="tariff-table">
                        <div className="tariff-table-head">
                          <span>{t("Size")}</span>
                          {tariffHours.map((hour) => (
                            <span key={hour}>{hour}h</span>
                          ))}
                          <span>72h+</span>
                        </div>

                        {tariffSizes.map((size) => (
                          <div className="tariff-table-row" key={`${branch}-${size}`}>
                            <b>{size}</b>
                            {tariffHours.map((hour) => (
                              <input
                                key={hour}
                                inputMode="numeric"
                                value={formatNumberInput(tariff.sizes?.[size]?.[hour] || 0)}
                                onChange={(event) =>
                                  handleBranchTariffChange(
                                    branch,
                                    size,
                                    hour,
                                    event.target.value,
                                  )
                                }
                              />
                            ))}
                            <input
                              inputMode="numeric"
                              value={formatNumberInput(tariff.sizes?.[size]?.after72 || 0)}
                              onChange={(event) =>
                                handleBranchTariffChange(
                                  branch,
                                  size,
                                  "after72",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="settings-card settings-card--system card">
              <div className="settings-title">
                <SettingsIcon size={18} />
                <h2>{t("System")}</h2>
              </div>

              <div className="system-settings">
                <label>
                  <span>{t("Overtime per hour")}</span>
                  <input
                    inputMode="numeric"
                    value={formatNumberInput(settings.overtimePerHour)}
                    onChange={(event) => {
                      const value = Number(cleanNumericInput(event.target.value) || 0);

                      if (!Number.isFinite(value) || value < 0) {
                        setMessage(
                          t("Overtime narxi manfiy bo'lmasligi kerak."),
                        );
                        return;
                      }

                      setSettings((prev) => ({
                        ...prev,
                        overtimePerHour: value,
                      }));
                    }}
                  />
                </label>

                <label>
                  <span>{t("Language")}</span>
                  <GlassSelect
                    value={normalizeLanguage(settings.language || language)}
                    onChange={(event) =>
                      handleLanguageChange(event.target.value)
                    }
                  >
                    {LANGUAGE_OPTIONS.map((item) => (
                      <option value={item.value} key={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </GlassSelect>
                </label>

                <label>
                  <span>{t("Currencies")}</span>
                  <input
                    value={(settings.currencies || []).join(",")}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        currencies: event.target.value
                          .split(",")
                          .map((item) => item.trim().toUpperCase())
                          .filter((currency) => ["UZS", "USD", "RUB", "EUR"].includes(currency)),
                      }))
                    }
                    placeholder="UZS,USD,RUB,EUR"
                  />
                </label>

                <label>
                  <span>{t("Default currency")}</span>
                  <GlassSelect
                    value={settings.defaultCurrency || "UZS"}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        defaultCurrency: event.target.value,
                      }))
                    }
                  >
                    {(settings.currencies || ["UZS"]).map((currency) => (
                      <option value={currency} key={currency}>
                        {currency}
                      </option>
                    ))}
                  </GlassSelect>
                </label>

                {["USD", "RUB", "EUR"].map((currency) => (
                  <label key={currency}>
                    <span>{currency} / UZS</span>
                    <input
                      inputMode="numeric"
                      value={formatNumberInput(settings.exchangeRates?.[currency] || 0)}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          exchangeRates: {
                            ...(prev.exchangeRates || {}),
                            UZS: 1,
                            [currency]: Number(cleanNumericInput(event.target.value) || 0),
                          },
                        }))
                      }
                    />
                  </label>
                ))}

                <label>
                  <span>{t("Theme")}</span>
                  <GlassSelect
                    value={settings.theme}
                    onChange={(event) => handleThemeChange(event.target.value)}
                  >
                    <option value="light">{t("Light")}</option>
                    <option value="dark">{t("Dark")}</option>
                  </GlassSelect>
                </label>
              </div>
            </div>

            <div className="settings-card settings-card--telegram telegram-card card">
              <div className="settings-title">
                <Send size={18} />
                <h2>{t("Telegram integration")}</h2>
              </div>

              <div className="telegram-status-row">
                <div>
                  <span>{t("Status")}</span>
                  <b
                    className={
                      settings.telegram?.enabled ? "active" : "inactive"
                    }
                  >
                    {settings.telegram?.enabled
                      ? t("Enabled")
                      : t("Disabled")}
                  </b>
                </div>

                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.enabled)}
                    onChange={(event) =>
                      handleTelegramChange("enabled", event.target.checked)
                    }
                  />
                  <span />
                </label>
              </div>

              <div className="telegram-form">
                <label>
                  <span>{t("Bot token")}</span>
                  <div className="token-input">
                    <input
                      type={showToken ? "text" : "password"}
                      value={settings.telegram?.botToken || ""}
                      onChange={(event) =>
                        handleTelegramChange("botToken", event.target.value)
                      }
                      placeholder="123456789:ABC..."
                    />

                    <button
                      type="button"
                      onClick={() => setShowToken((prev) => !prev)}
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label>
                  <span>{t("Group ID")}</span>
                  <input
                    value={settings.telegram?.groupId || ""}
                    onChange={(event) =>
                      handleTelegramChange("groupId", event.target.value)
                    }
                    placeholder="-1001234567890"
                  />
                </label>
              </div>

              <div className="telegram-toggles">
                {[
                  ...telegramEventLabels,
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.telegram?.[key])}
                      onChange={(event) =>
                        handleTelegramChange(key, event.target.checked)
                      }
                    />
                    <span>{t(label)}</span>
                  </label>
                ))}
              </div>

              <div className="telegram-branch-list">
                <h3>{t("Filial Telegram groups")}</h3>
                {branchNames.map((branch) => {
                  const group = settings.telegram?.groups?.[branch] || {};

                  return (
                    <div className="telegram-branch-row" key={branch}>
                      <div>
                        <b>{t(branch)}</b>
                        <label className="toggle-line mini">
                          <input
                            type="checkbox"
                            checked={group.enabled !== false}
                            onChange={(event) =>
                              handleTelegramGroupChange(
                                branch,
                                "enabled",
                                event.target.checked,
                              )
                            }
                          />
                          <span />
                        </label>
                      </div>
                      <input
                        value={group.token || ""}
                        onChange={(event) =>
                          handleTelegramGroupChange(
                            branch,
                            "token",
                            event.target.value,
                          )
                        }
                        placeholder={t("Bot token")}
                      />
                      <input
                        value={group.groupId || ""}
                        onChange={(event) =>
                          handleTelegramGroupChange(
                            branch,
                            "groupId",
                            event.target.value,
                          )
                        }
                        placeholder={t("Group ID")}
                      />
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="telegram-test-btn"
                onClick={handleTestTelegram}
              >
                <Bell size={16} />
                {t("Test send")}
              </button>

              {testStatus && (
                <div className="telegram-test-status">{testStatus}</div>
              )}
            </div>

            <div className="settings-card settings-card--platform card">
              <div className="settings-title">
                <SettingsIcon size={18} />
                <h2>{t("Platform settings")}</h2>
              </div>

              <div className="system-settings">
                <label>
                  <span>{t("Printer width")}</span>
                  <GlassSelect
                    value={settings.printer?.paperWidth || "80mm"}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        printer: {
                          ...(prev.printer || {}),
                          paperWidth: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="80mm">80mm</option>
                    <option value="58mm">58mm</option>
                  </GlassSelect>
                </label>

                <label className="check-line">
                  <input
                    type="checkbox"
                    checked={settings.printer?.logoEnabled !== false}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        printer: {
                          ...(prev.printer || {}),
                          logoEnabled: event.target.checked,
                        },
                      }))
                    }
                  />
                  <span>{t("Chekda logo ko'rsatish")}</span>
                </label>

                <label>
                  <span>{t("Logo path")}</span>
                  <input
                    value={settings.printer?.logoSrc || "/1.jpg"}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        printer: {
                          ...(prev.printer || {}),
                          logoSrc: event.target.value,
                        },
                      }))
                    }
                    placeholder="/1.jpg"
                  />
                </label>

                <label>
                  <span>{t("Google Sheets endpoint")}</span>
                  <input
                    value={settings.googleSheets?.endpoint || ""}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        googleSheets: {
                          ...(prev.googleSheets || {}),
                          endpoint: event.target.value,
                        },
                      }))
                    }
                    placeholder="Backend webhook keyin ulanadi"
                  />
                </label>
              </div>

              <div className="telegram-toggles">
                {["orders", "shifts", "finance", "analytics"].map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.exportCenter?.[key])}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          exportCenter: {
                            ...(prev.exportCenter || {}),
                            [key]: event.target.checked,
                          },
                        }))
                      }
                    />
                    <span>{t("Export")} {t(exportLabels[key])}</span>
                  </label>
                ))}
              </div>

              <div className="export-actions">
                {["orders", "shifts", "finance", "analytics"].map((key) => (
                  <div key={key}>
                    <span>{t("Export")} {t(exportLabels[key])}</span>
                    <button type="button" onClick={() => exportService.exportJson(key)}>
                      JSON
                    </button>
                    <button type="button" onClick={() => exportService.exportPdf(key)}>
                      PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="settings-card settings-card--danger card">
                <div className="settings-title danger">
                  <RotateCcw size={18} />
                  <h2>{t("Reset data")}</h2>
                </div>

                <div className="reset-data-box">
                  <div>
                    <b>{t("Programmani 0 holatga qaytarish")}</b>
                    <span>{t("Order, shift, kassa, qarz, xarajat, inkassa, notification va audit tarixlari o'chiriladi.")}</span>
                    <span>{t("Filial, admin, yacheyka, tarif va Telegram sozlamalari saqlanadi.")}</span>
                  </div>

                  <label>
                    <span>{t("Tasdiqlash uchun RESET yozing")}</span>
                    <input
                      value={resetConfirmText}
                      onChange={(event) => setResetConfirmText(event.target.value)}
                      placeholder="RESET"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetData}
                    disabled={resetPending || resetConfirmText !== "RESET"}
                  >
                    <RotateCcw size={16} />
                    {resetPending ? t("Loading") : t("Reset data")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </section>
  );
}
