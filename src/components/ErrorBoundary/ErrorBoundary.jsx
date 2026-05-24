import { Component } from "react";
import settingsService from "../../services/settingsService";
import { translate } from "../../i18n/translations";

const getText = (key) => {
  try {
    return translate(key, settingsService.get()?.language);
  } catch {
    return translate(key);
  }
};

export default class ErrorBoundary extends Component {
  state = {
    error: null,
  };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application render error:", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary">
        <section>
          <h1>{getText("Saytni yuklashda xatolik yuz berdi")}</h1>
          <p>{this.state.error.message || getText("Noma'lum xatolik")}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {getText("Qayta yuklash")}
          </button>
        </section>
      </main>
    );
  }
}
