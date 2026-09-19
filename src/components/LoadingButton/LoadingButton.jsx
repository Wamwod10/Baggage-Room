import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import "./loadingButton.scss";

export default function LoadingButton({ type="button", className="", loading=false, loadingLabel="Loading...", delayedLoadingLabel="Server javobi kutilmoqda...", disabled=false, children, ...props }) {
  const [delayed,setDelayed]=useState(false);
  useEffect(()=>{ if(!loading){setDelayed(false);return undefined;} const timer=window.setTimeout(()=>setDelayed(true),3000); return()=>window.clearTimeout(timer); },[loading]);
  const visibleLabel = delayed && loadingLabel ? delayedLoadingLabel : loadingLabel;
  return <button type={type} className={["loading-button",className].filter(Boolean).join(" ")} disabled={disabled||loading} aria-busy={loading} {...props}>
    <span className="loading-button__content">
      <span className={loading?"loading-button__idle is-hidden":"loading-button__idle"}>{children}</span>
      <span className={loading?"loading-button__loading":"loading-button__loading is-hidden"}><LoaderCircle className="loading-button__spinner" size={17} aria-hidden="true"/>{visibleLabel && <span>{visibleLabel}</span>}</span>
    </span>
  </button>;
}
