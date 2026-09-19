import { Cloud, CloudOff, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import apiClient from "../../services/apiClient";
import "./connectionStatus.scss";

const labelFor = (online, latency) => {
  if (!online) return "Offline";
  if (latency == null) return "Tekshirilmoqda";
  if (latency < 350) return "Yaxshi";
  if (latency < 850) return "O'rtacha";
  return "Sekin";
};

export default function ConnectionStatus({ t = (value) => value }) {
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  const [serverOnline, setServerOnline] = useState(true);
  const [latency, setLatency] = useState(null);
  const [reconnected, setReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer = null;
    let controller = null;

    const probe = async () => {
      if (disposed || !navigator.onLine) {
        if (!disposed) { setBrowserOnline(false); setServerOnline(false); setLatency(null); }
        return;
      }
      setBrowserOnline(true);
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      const started = performance.now();
      let timeout = null;
      let timedOut = false;
      try {
        const configured = String(apiClient.defaults.baseURL || "https://baggage-room-backend.onrender.com/api").replace(/\/+$/, "");
        const healthUrl = `${configured.replace(/\/api$/, "")}/health`;
        timeout = window.setTimeout(() => { timedOut = true; requestController.abort(); }, 5000);
        const response = await fetch(healthUrl, { signal: requestController.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Health ${response.status}`);
        if (disposed) return;
        const value = Math.round(performance.now() - started);
        setLatency(value);
        setServerOnline(true);
        if (wasOffline.current) {
          setReconnected(true);
          window.setTimeout(() => setReconnected(false), 2400);
        }
        wasOffline.current = false;
      } catch (error) {
        if (disposed || controller !== requestController) return;
        if (error?.name === "AbortError" && requestController.signal.aborted && !timedOut) return;
        setServerOnline(false);
        setLatency(null);
        wasOffline.current = true;
      } finally {
        if (timeout) window.clearTimeout(timeout);
      }
    };

    const schedule = () => {
      window.clearInterval(timer);
      void probe();
      timer = window.setInterval(probe, document.hidden ? 60000 : 20000);
    };
    const onOnline = () => { setBrowserOnline(true); schedule(); };
    const onOffline = () => { setBrowserOnline(false); setServerOnline(false); setLatency(null); wasOffline.current = true; };
    const onVisibility = () => schedule();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const online = browserOnline && serverOnline;
  const label = !browserOnline ? "Internet yo'q" : !serverOnline ? "Server aloqa yo'q" : labelFor(true, latency);
  return (
    <>
      <div className={`connection-status ${online ? "online" : "offline"} ${latency > 850 ? "slow" : ""}`} title={online ? `${latency ?? "-"} ms` : t("Aloqa yo'q")}>
        {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>{latency == null ? t(label) : `${latency} ms`}</span>
        <i>{t(label)}</i>
      </div>
      {!online && (
        <div className="connection-banner offline"><CloudOff size={17} /><b>{t(!browserOnline ? "Internet uzildi" : "Server bilan aloqa uzildi")}</b><span>{t("Qayta ulanmoqda...")}</span></div>
      )}
      {reconnected && (
        <div className="connection-banner restored"><Cloud size={17} /><b>{t("Aloqa tiklandi")}</b></div>
      )}
    </>
  );
}
