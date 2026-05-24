import { useEffect, useState } from "react";
import {
  Save,
  Settings as SettingsIcon,
  Send,
  Bell,
  Eye,
  EyeOff,
} from "lucide-react";
import settingsService from "../../services/settingsService";
import StateBlock from "../../components/StateBlock/StateBlock";
import { ListSkeleton } from "../../components/Skeleton/Skeleton";
import usePageResource from "../../hooks/usePageResource";
import { LANGUAGE_OPTIONS, normalizeLanguage } from "../../i18n/translations";
import { useTranslation } from "../../i18n/useTranslation";
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
  telegram: {
    botToken: "",
    groupId: "",
    enabled: false,
    newOrder: false,
    shiftOpened: false,
    shiftClosed: false,
    orderCancelled: false,
    delayedBaggage: false,
    expenseAlerts: false,
  },
};

export default function Settings() {
  const { t, language, setLanguage, formatDateTime } = useTranslation();
  const [settings, setSettings] = useState(fallbackSettings);
  const [message, setMessage] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [showToken, setShowToken] = useState(false);
  const {
    data: loadedSettings,
    isLoading,
    error,
    retry,
  } = usePageResource(() => settingsService.get(), [], fallbackSettings);

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

  const handlePricingChange = (size, value) => {
    const price = Number(value || 0);

    if (!Number.isFinite(price) || price < 0) {
      setMessage(t("Narx manfiy bo'lishi mumkin emas."));
      return;
    }

    setSettings((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [size]: price,
      },
    }));
  };

  const handleTelegramChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      telegram: {
        ...prev.telegram,
        [key]: value,
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

  const handleSave = () => {
    const prices = Object.values(settings.pricing || {});

    if (
      prices.some(
        (price) => !Number.isFinite(Number(price)) || Number(price) < 0,
      )
    ) {
      setMessage(t("Pricing qiymatlari manfiy bo'lmasligi kerak."));
      return;
    }

    if (
      !Number.isFinite(Number(settings.overtimePerHour)) ||
      Number(settings.overtimePerHour) < 0
    ) {
      setMessage(t("Overtime narxi manfiy bo'lmasligi kerak."));
      return;
    }

    if (settings.telegram?.enabled) {
      if (
        !settings.telegram?.botToken?.trim() ||
        !settings.telegram?.groupId?.trim()
      ) {
        setMessage(
          t("Telegram yoqilgan bo'lsa, Bot token va Group ID majburiy."),
        );
        return;
      }
    }

    try {
      const savedSettings = settingsService.save({
        ...settings,
        language: normalizeLanguage(settings.language),
      });
      setLanguage(savedSettings.language);
      setMessage(t("Settings saqlandi"));
    } catch {
      setMessage(t("Settings saqlashda xatolik yuz berdi."));
    }
  };

  const handleTestTelegram = async () => {
    const token = settings.telegram?.botToken?.trim();
    const groupId = settings.telegram?.groupId?.trim();

    if (!token || !groupId) {
      setTestStatus(t("Bot token va Group ID kiritilishi kerak"));
      return;
    }

    setTestStatus(t("Test xabar yuborilmoqda..."));

    try {
      settingsService.save(settings);

      const text = [
        "✅ Baggage Room test xabari",
        "",
        "Telegram integration ishlayapti.",
        `${t("Sana")}: ${formatDateTime(new Date())}`,
      ].join("\n");

      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: groupId,
            text,
          }),
        },
      );

      const data = await response.json();

      if (!data.ok) {
        setTestStatus(data.description || t("Telegram test xabar yuborilmadi"));
        return;
      }

      setTestStatus(t("Test xabar Telegram groupga yuborildi"));
    } catch {
      setTestStatus(t("Telegram bilan ulanishda xatolik yuz berdi"));
    }
  };

  return (
    <section className="page settings-page">
      <div className="page-header compact-header">
        <div>
          <h1>{t("Settings")}</h1>
          <p>
            {t("Pricing presetlar, overtime, Telegram va system sozlamalari")}
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
            <div className="settings-card card">
              <div className="settings-title">
                <SettingsIcon size={18} />
                <h2>{t("Pricing presets")}</h2>
              </div>

              <div className="pricing-list">
                {Object.entries(settings.pricing || {}).map(([size, price]) => (
                  <label key={size}>
                    <span>{size}</span>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(event) =>
                        handlePricingChange(size, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="settings-card card">
              <div className="settings-title">
                <SettingsIcon size={18} />
                <h2>{t("System")}</h2>
              </div>

              <div className="system-settings">
                <label>
                  <span>{t("Overtime per hour")}</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.overtimePerHour}
                    onChange={(event) => {
                      const value = Number(event.target.value || 0);

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
                  <select
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
                  </select>
                </label>

                <label>
                  <span>{t("Theme")}</span>
                  <select
                    value={settings.theme}
                    onChange={(event) => handleThemeChange(event.target.value)}
                  >
                    <option value="light">{t("Light")}</option>
                    <option value="dark">{t("Dark")}</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="settings-card telegram-card card">
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
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.newOrder)}
                    onChange={(event) =>
                      handleTelegramChange("newOrder", event.target.checked)
                    }
                  />
                  <span>{t("Yangi order xabari")}</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.shiftClosed)}
                    onChange={(event) =>
                      handleTelegramChange("shiftClosed", event.target.checked)
                    }
                  />
                  <span>{t("Shift yopilganda report")}</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.shiftOpened)}
                    onChange={(event) =>
                      handleTelegramChange("shiftOpened", event.target.checked)
                    }
                  />
                  <span>{t("Kassa ochilganda xabar")}</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.orderCancelled)}
                    onChange={(event) =>
                      handleTelegramChange(
                        "orderCancelled",
                        event.target.checked,
                      )
                    }
                  />
                  <span>{t("Order bekor qilinganda xabar")}</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.delayedBaggage)}
                    onChange={(event) =>
                      handleTelegramChange(
                        "delayedBaggage",
                        event.target.checked,
                      )
                    }
                  />
                  <span>{t("Kechikkan bagaj alert")}</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.telegram?.expenseAlerts)}
                    onChange={(event) =>
                      handleTelegramChange(
                        "expenseAlerts",
                        event.target.checked,
                      )
                    }
                  />
                  <span>{t("Harajat alertlari")}</span>
                </label>
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
          </div>
        )
      )}
    </section>
  );
}
