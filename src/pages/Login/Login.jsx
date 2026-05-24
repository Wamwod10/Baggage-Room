import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import "./login.scss";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "rahbariyat",
    password: "admin123",
  });

  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      login(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">BR</div>
          <div>
            <h1>Baggage Room</h1>
          <p>{t("Management System")}</p>
          </div>
        </div>

        <div className="login-heading">
          <h2>{t("Tizimga kirish")}</h2>
          <p>{t("Filial baggage boshqaruvi uchun admin panel")}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>{t("Login")}</span>
            <div className="login-input">
              <User size={18} />
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder={t("Login kiriting")}
              />
            </div>
          </label>

          <label>
            <span>{t("Parol")}</span>
            <div className="login-input">
              <Lock size={18} />
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={t("Parol kiriting")}
              />
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn">
            {t("Kirish")}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-demo">
          <p>{t("Loginlar")}:</p>
          <span>rahbariyat / admin123</span>
          <span>tashkent_airport / 12345</span>
          <span>tashkent_north / 12345</span>
          <span>tashkent_south / 12345</span>
          <span>samarkand_station / 12345</span>
          <span>samarkand_airport / 12345</span>
        </div>
      </section>
    </main>
  );
}
