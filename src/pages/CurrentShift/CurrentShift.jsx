import { Briefcase, CheckCircle, Clock3, ListChecks, MoveRight, RotateCcw, Wallet, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StateBlock from "../../components/StateBlock/StateBlock";
import shiftService from "../../services/shiftService";
import { useAuth } from "../../store/AuthContext";
import { formatTashkentDateTime } from "../../utils/formatDate";
import "./currentShift.scss";

const cards = [
  ["createdOrders", "Yangi bagaj", Briefcase, "cyan"],
  ["pickups", "Pickup", CheckCircle, "green"],
  ["closedDebts", "Yopilgan qarz", Wallet, "amber"],
  ["cancellations", "Bekor qilingan", XCircle, "rose"],
  ["transfers", "Transfer", MoveRight, "violet"],
  ["cashOperations", "Kassa amallari", ListChecks, "blue"],
];

const durationText = (from, now) => {
  if (!from) return "—";
  const ms = Math.max(0, now - new Date(from).getTime());
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours} soat ${minutes} daqiqa`;
};

export default function CurrentShift() {
  const { effectiveBranch, user, isSuperAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());

  const load = async () => {
    if (isSuperAdmin && !effectiveBranch) { setData(null); setError(""); setLoading(false); return; }
    setLoading(true); setError("");
    try { setData(await shiftService.getOperatorStats(effectiveBranch)); }
    catch (err) { if (!err?.cancelled) setError(err?.message || "Smena statistikasi yuklanmadi"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isSuperAdmin && !effectiveBranch) { setData(null); setError(""); setLoading(false); return undefined; }
    let active = true;
    let timer = null;
    let controller = null;
    let firstLoad = true;

    const refresh = async () => {
      if (!active) return;
      controller?.abort();
      controller = new AbortController();
      if (firstLoad) setLoading(true);
      setError("");
      try {
        const value = await shiftService.getOperatorStats(effectiveBranch, { signal: controller.signal });
        if (active) setData(value);
      } catch (err) {
        if (active && !err?.cancelled) setError(err?.message || "Smena statistikasi yuklanmadi");
      } finally {
        if (active) {
          setLoading(false);
          firstLoad = false;
          timer = window.setTimeout(refresh, document.hidden ? 180000 : 60000);
        }
      }
    };

    const onVisibility = () => {
      window.clearTimeout(timer);
      if (!document.hidden) void refresh();
      else timer = window.setTimeout(refresh, 180000);
    };
    document.addEventListener("visibilitychange", onVisibility);
    void refresh();
    return()=>{ active=false; controller?.abort(); window.clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [effectiveBranch, isSuperAdmin]);
  useEffect(() => { const id=window.setInterval(()=>setTick(Date.now()),30000); return()=>window.clearInterval(id); }, []);

  const stats = data?.stats || {};
  const operatorName = data?.shift?.operatorName || data?.shift?.acceptedByName || data?.shift?.operator?.name || data?.shift?.operator?.login || "—";
  const duration = useMemo(() => durationText(data?.shift?.openedAt, tick), [data?.shift?.openedAt, tick]);

  return <div className="shift-dashboard">
    <section className="shift-dashboard__hero">
      <div><span>JORIY SMENA</span><h1>{operatorName}</h1><p>{data?.shift?.branchName || user?.branchName || effectiveBranch || "Filial"}</p></div>
      <div className="shift-dashboard__meta"><div><Clock3 size={18}/><span>Smena boshlandi<b>{data?.shift?.openedAt ? formatTashkentDateTime(data.shift.openedAt) : "—"}</b></span></div><div><RotateCcw size={18}/><span>Davomiyligi<b>{duration}</b></span></div></div>
    </section>

    {isSuperAdmin && !effectiveBranch && !loading && <StateBlock type="info" title="Filialni tanlang" description="Joriy smena statistikasini ko'rish uchun topbar orqali bitta filialni tanlang."/>}
    {loading && <div className="shift-dashboard__loading">Smena statistikasi yuklanmoqda...</div>}
    {!loading && error && <StateBlock type="error" title="Statistika yuklanmadi" description={error} actionLabel="Qayta urinish" onAction={load}/>} 
    {!loading && !error && !data && !(isSuperAdmin && !effectiveBranch) && <StateBlock type="clock" title="Ochiq smena yo'q" description="Smena ochilgandan keyin xodimning statistikasi shu yerda 0 dan boshlanadi."/>}
    {!loading && !error && data && <>
      {!data.viewerIsOperator && <div className="shift-dashboard__notice">Bu smena <b>{operatorName}</b> tomonidan qabul qilingan. Quyidagi raqamlar aynan shu smena operatoriga tegishli.</div>}
      <div className="shift-dashboard__grid">{cards.map(([key,label,Icon,accent])=><article className={`shift-stat-card ${accent}`} key={key}><div><Icon size={20}/></div><span>{label}</span><b>{Number(stats[key]||0)}</b><small>shu smenada</small></article>)}</div>
      <section className="shift-dashboard__footer"><div><b>Statistika chegarasi</b><p>Faqat shu filial, shu OPEN shift va smenani qabul qilgan xodim amallari hisoblanadi.</p></div><button type="button" onClick={load}><RotateCcw size={16}/>Yangilash</button></section>
    </>}
  </div>;
}
