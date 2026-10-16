import type { ReadSource, HomepageLanguage } from "@homepage/agent-core";
import { isAllowedUrl } from "@homepage/agent-core";
import { t } from "@/lib/i18n";

export function SourcesPanel({
  sources, locale, onClose,
}: {
  sources: ReadSource[];
  locale: HomepageLanguage;
  onClose: () => void;
}) {
  const safe = sources.filter(source => isAllowedUrl(source.url, []) && source.url.length < 2048);
  return (
    <div role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", zIndex: 1200, display: "flex", justifyContent: "flex-end" }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="sources-title"
        style={{ background: "#fff", color: "#222", width: "min(440px,100vw)", height: "100%", overflowY: "auto", boxSizing: "border-box", padding: 24, fontFamily: "system-ui,'Noto Sans CJK SC',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 id="sources-title" style={{ margin: 0, fontSize: 21 }}>{t(locale, "readSourceTitle")}</h2>
          <button onClick={onClose} aria-label={t(locale, "closeSources")} style={{ border: "1px solid #bbb", background: "#fff", color: "#222", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, marginTop: 14 }}>{t(locale, "readSourceDisclaimer")}</p>
        {safe.length===0 && <p>{t(locale, "readSourceEmpty")}</p>}
        <ol style={{ listStyle: "none", margin: "18px 0", padding: 0 }}>
          {safe.map((source, index) => {
            const date = new Date(source.readAt);
            const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale);
            return (
              <li key={source.url + String(index)} style={{ padding: "14px 0", borderTop: "1px solid #ddd" }}>
                <a href={source.url} rel="noopener noreferrer" target="_blank"
                  style={{ color: "#0969da", fontWeight: 600, textDecoration: "none", overflowWrap: "anywhere" }}>
                  {source.title || new URL(source.url).hostname}
                </a>
                {source.origin && <div style={{ fontSize: 12, color: "#555", marginTop: 5 }}>{t(locale, source.origin === "followed" ? "followedOrigin" : "historyOrigin")}</div>}
                <div style={{ fontSize: 12, color: "#555", overflowWrap: "anywhere", marginTop: 5 }}>{source.url}</div>
                {time && <div style={{ fontSize: 12, color: "#666", marginTop: 5 }}>{t(locale, "readAt")} {time}</div>}
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
