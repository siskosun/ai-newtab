import { useState } from "react";
import {
  PROVIDERS, HOMEPAGE_LANGUAGES, providerPreset,
  normalizeBlockList, normalizeFollowedSites, isKeylessLocalProvider, type ProviderId, type HomepageLanguage,
} from "@homepage/agent-core";
import { REBUILD_INTERVAL_CHOICES } from "@/lib/auto-rebuild";
import { t } from "@/lib/i18n";
import { btn } from "./ui";

export interface ProviderConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  endpoint: string;
}
export interface SettingsModalProps {
  initialPrompt: string;
  blockedSites: string[];
  followedSites: string[];
  provider: ProviderId;
  model: string;
  apiKey: string;
  endpoint: string;
  locale: HomepageLanguage;
  autoRebuild: boolean;
  onToggleAutoRebuild: (enabled: boolean) => void;
  incrementalUpdates: boolean;
  onToggleIncrementalUpdates: (enabled: boolean) => void;
  intervalHours: number;
  onChangeInterval: (hours: number) => void;
  onClose: () => void;
  onSave: (prompt: string, sites: string[], followed: string[], config: ProviderConfig, language: HomepageLanguage) => Promise<void>;
}

const inputStyle = {
  display: "block" as const, width: "100%", padding: 9, marginTop: 6,
  boxSizing: "border-box" as const, borderRadius: 5, border: "1px solid #ccc",
};

export function SettingsModal({
  initialPrompt, blockedSites, followedSites, provider, model, apiKey, endpoint, locale,
  autoRebuild, onToggleAutoRebuild, incrementalUpdates, onToggleIncrementalUpdates, intervalHours, onChangeInterval,
  onClose, onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState(initialPrompt);
  const [blockedDraft, setBlockedDraft] = useState(blockedSites.join("\n"));
  const [followedDraft, setFollowedDraft] = useState(followedSites.join("\n"));
  const [providerDraft, setProviderDraft] = useState<ProviderId>(provider);
  const [languageDraft, setLanguageDraft] = useState<HomepageLanguage>(locale);
  const [modelDraft, setModelDraft] = useState(model);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [endpointDraft, setEndpointDraft] = useState(endpoint);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function choose(next: ProviderId) {
    setProviderDraft(next);
    setError("");
    try {
      const stored = await browser.storage.local.get("providerCredentials");
      const profiles = stored.providerCredentials as Record<string, {apiKey:string;model:string;endpoint:string}> | undefined;
      const selected = profiles?.[next];
      setModelDraft(selected?.model ?? providerPreset(next).model);
      setKeyDraft(selected?.apiKey ?? "");
      setEndpointDraft(selected?.endpoint ?? "");
    } catch {
      setModelDraft(providerPreset(next).model);
      setKeyDraft("");
      setEndpointDraft("");
    }
  }

  async function save() {
    if (!modelDraft.trim()) { setError(t(languageDraft, "modelRequired")); return; }
    if (providerDraft === "compatible" && !endpointDraft.trim()) { setError(t(languageDraft, "endpointRequired")); return; }
    const localWithoutKey = isKeylessLocalProvider(providerDraft, endpointDraft);
    if (!keyDraft.trim() && !localWithoutKey) { setError(t(languageDraft, "keyRequired")); return; }
    const normalizedBlocked = normalizeBlockList(blockedDraft.split("\n"));
    const followed = normalizeFollowedSites(followedDraft.split("\n"), normalizedBlocked);
    if (followed.rejected.length) {
      setError(t(languageDraft, "followedInvalid") + " " + followed.rejected.slice(0, 4).map(item => item.input).join(", "));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(draft, normalizedBlocked, followed.sites, {
        provider: providerDraft, model: modelDraft.trim(),
        apiKey: keyDraft.trim(), endpoint: endpointDraft.trim(),
      }, languageDraft);
    } catch (cause) {
      setError(t(languageDraft, "errorGeneric") + String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        role="dialog" aria-modal="true" aria-labelledby="homepage-settings-title"
        style={{ width: "min(620px,94vw)", maxHeight: "94vh", overflowY: "auto", padding: 24, background: "#fff", borderRadius: 12, color: "#222", fontFamily: "system-ui, 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif" }}
      >
        <h2 id="homepage-settings-title">{t(languageDraft, "settingsTitle")}</h2>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "language")}
          <select aria-label={t(languageDraft, "language")} value={languageDraft} onChange={(e) => setLanguageDraft(e.target.value as HomepageLanguage)} style={inputStyle}>
            {HOMEPAGE_LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
          </select>
        </label>
        <p style={{ fontSize: 12, color: "#666" }}>{t(languageDraft, "languageHelp")}</p>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "provider")}
          <select value={providerDraft} onChange={(e) => void choose(e.target.value as ProviderId)} style={inputStyle}>
            {PROVIDERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "modelId")}
          <input value={modelDraft} onChange={(e) => setModelDraft(e.target.value)} style={inputStyle} placeholder={t(languageDraft, "modelPlaceholder")} />
        </label>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "apiKey")}
          <input type="password" autoComplete="off" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} style={inputStyle} placeholder={t(languageDraft, "apiKeyPlaceholder")} />
        </label>
        {providerDraft === "compatible" && (
          <label style={{ display: "block", marginTop: 14 }}>
            {t(languageDraft, "endpoint")}
            <input value={endpointDraft} onChange={(e) => setEndpointDraft(e.target.value)} style={inputStyle} placeholder={t(languageDraft, "endpointPlaceholder")} />
          </label>
        )}
        <p style={{ fontSize: 12, color: "#666" }}>{t(languageDraft, "credentialNote")}</p>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "instructions")}
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t(languageDraft, "instructionsPlaceholder")} style={{ ...inputStyle, height: 85 }} />
        </label>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "followedSites")}
          <textarea aria-label={t(languageDraft, "followedSites")} value={followedDraft} onChange={(e) => setFollowedDraft(e.target.value)} placeholder={t(languageDraft, "followedPlaceholder")} style={{ ...inputStyle, height: 95 }} />
        </label>
        <p style={{ fontSize: 12, color: "#666", lineHeight: 1.65 }}>{t(languageDraft, "followedHelp")}</p>
        <label style={{ display: "block", marginTop: 14 }}>
          {t(languageDraft, "blockedSites")}
          <textarea value={blockedDraft} onChange={(e) => setBlockedDraft(e.target.value)} style={{ ...inputStyle, height: 90 }} />
        </label>
        <p style={{ fontSize: 12, color: "#666" }}>{t(languageDraft, "blockedHelp")}</p>
        <label style={{ display: "block", marginTop: 14 }}>
          <input type="checkbox" checked={autoRebuild} onChange={(e) => onToggleAutoRebuild(e.target.checked)} />
          {" "}{t(languageDraft, "autoRebuild")}
        </label>
        <label style={{ display: "block", marginTop: 10, opacity: autoRebuild ? 1 : .6 }}>
          <input type="checkbox" checked={incrementalUpdates} disabled={!autoRebuild}
            onChange={(e) => onToggleIncrementalUpdates(e.target.checked)} />
          {" "}{t(languageDraft, "incrementalUpdates")}
        </label>
        <p style={{ fontSize: 12, color:"#666", lineHeight:1.5, marginTop:6 }}>{t(languageDraft, "incrementalHelp")}</p>
        <label style={{ display: "block", marginTop: 10 }}>
          {t(languageDraft, "every")}
          <select value={intervalHours} disabled={!autoRebuild} onChange={(e) => onChangeInterval(Number(e.target.value))} style={{ marginLeft: 10, padding: 6 }}>
            {REBUILD_INTERVAL_CHOICES.map((hours) => <option key={hours} value={hours}>{hours} {t(languageDraft, "hours")}</option>)}
          </select>
        </label>
        {error && <p role="alert" style={{ color: "#c22" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} disabled={saving}>{t(languageDraft, "cancel")}</button>
          <button style={btn} disabled={saving} onClick={() => void save()}>{t(languageDraft, "saveRebuild")}</button>
        </div>
      </div>
    </div>
  );
}
