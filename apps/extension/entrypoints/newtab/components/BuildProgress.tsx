import { useEffect, useRef, useState } from "react";
import type { HomepageLanguage } from "@homepage/agent-core";
import { t } from "@/lib/i18n";
import { BUILD_STEPS, LOG_RETENTION, type BuildState } from "@/lib/protocol";

const stepLabels = [
  "stepSetup", "stepHistory", "stepScraping", "stepAnalyzing", "stepWriting",
] as const;

export function BuildProgress({
  state, onCancel, onBack, locale,
}: {
  state: BuildState;
  locale: HomepageLanguage;
  onCancel: () => void;
  onBack?: () => void;
}) {
  const { stepIndex, detail, narration, logs } = state;
  const [elapsed, setElapsed] = useState(0);
  const narrRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((previous) => previous + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (narrRef.current) narrRef.current.scrollTop = narrRef.current.scrollHeight;
  }, [narration]);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  const readableDetail = state.phase === "scraping" && /^\d+$/.test(detail)
    ? detail + " " + t(locale, "scrapedUnit")
    : detail;

  return (
    <div className="build">
      <div className="build-left">
        <div className="build-panel">
          <div className="build-top">
            <span className="build-title">{t(locale, "progressTitle")}</span>
            <span className="build-elapsed">{minutes}:{seconds}</span>
          </div>
          <ol className="build-steps">
            {BUILD_STEPS.map((step, index) => {
              const status = index < stepIndex ? "done" : index === stepIndex ? "active" : "pending";
              return (
                <li key={step.label} className={"build-step " + status}>
                  <span className="build-marker">{status === "done" ? "✓" : index + 1}</span>
                  <div className="build-step-body">
                    <div className="build-step-label">{t(locale, stepLabels[index])}</div>
                    {status === "active" && readableDetail && <div className="build-step-detail">{readableDetail}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="build-cancel" onClick={onCancel}>{t(locale, "cancelBuild")}</button>
            {onBack && <button className="build-cancel" style={{ background: "transparent" }} onClick={onBack}>
              ← {t(locale, "backHome")}
            </button>}
          </div>
        </div>
      </div>
      <div className="build-right">
        <div className="build-panel">
          <div className="build-eyebrow">{t(locale, "agent")}</div>
          <div className="build-narration" ref={narrRef}>
            {narration || t(locale, "progressWarming")}
          </div>
          {logs.length > 0 && (
            <>
              <div className="build-eyebrow build-log-label">{t(locale, "activity")}</div>
              <pre className="build-log" ref={logRef}>{logs.slice(-LOG_RETENTION).join("\n")}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
