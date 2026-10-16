import { useState } from "react";
import {
  PROVIDERS, HOMEPAGE_LANGUAGES, providerPreset,
  type ProviderId, type HomepageLanguage, isKeylessLocalProvider,
} from "@homepage/agent-core";
import { t } from "@/lib/i18n";
import { btn } from "./ui";

const inputStyle = {
  display: "block" as const, padding: 10, width: "100%",
  boxSizing: "border-box" as const, marginTop: 7, marginBottom: 13,
};

export function ApiKeySetup({locale,onChangeLocale,onSave}: {
  locale: HomepageLanguage;
  onChangeLocale: (locale: HomepageLanguage) => Promise<void>;
  onSave: (key: string, provider: ProviderId, model: string, endpoint: string) => Promise<void>;
}) {
  const [provider,setProvider] = useState<ProviderId>("openai");
  const [model,setModel] = useState(providerPreset("openai").model);
  const [key,setKey] = useState("");
  const [endpoint,setEndpoint] = useState("");
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);

  async function save() {
    if (!model.trim()) {setError(t(locale,"modelRequired"));return;}
    if (provider === "compatible" && !endpoint.trim()) {setError(t(locale,"endpointRequired"));return;}
    const localWithoutKey = isKeylessLocalProvider(provider, endpoint);
    if (!key.trim() && !localWithoutKey) {setError(t(locale,"keyRequired"));return;}
    setSaving(true);
    setError("");
    try {await onSave(key.trim(),provider,model.trim(),endpoint.trim());}
    catch(cause) {setError(t(locale,"errorGeneric")+String(cause));}
    finally {setSaving(false);}
  }

  return (
    <div style={{ maxWidth: 540, margin: "9vh auto", padding: 24, fontFamily: "system-ui, 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif" }}>
      <label style={{ display: "block", marginBottom: 20 }}>
        {t(locale,"language")}
        <select value={locale} onChange={(e) => void onChangeLocale(e.target.value as HomepageLanguage)} style={inputStyle}>
          {HOMEPAGE_LANGUAGES.map((lang) => <option value={lang.id} key={lang.id}>{lang.label}</option>)}
        </select>
      </label>
      <h1>{t(locale, "connectTitle")}</h1>
      <p style={{ color: "#555", lineHeight: 1.7 }}>{t(locale, "connectDescription")}</p>
      <label style={{ display: "block" }}>
        {t(locale,"provider")}
        <select value={provider} onChange={(e) => {
          const next=e.target.value as ProviderId;
          setProvider(next);setModel(providerPreset(next).model);setKey("");setEndpoint("");
        }} style={inputStyle}>
          {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <label style={{ display: "block" }}>
        {t(locale,"modelId")}
        <input value={model} onChange={(e)=>setModel(e.target.value)} placeholder={t(locale,"modelPlaceholder")} style={inputStyle} />
      </label>
      <label style={{ display: "block" }}>
        {t(locale,"apiKey")}
        <input type="password" autoComplete="off" value={key} onChange={(e)=>setKey(e.target.value)} placeholder={t(locale,"apiKeyPlaceholder")} style={inputStyle} />
      </label>
      {provider === "compatible" && (
        <label style={{ display: "block" }}>
          {t(locale,"endpoint")}
          <input value={endpoint} onChange={(e)=>setEndpoint(e.target.value)} placeholder={t(locale,"endpointPlaceholder")} style={inputStyle} />
        </label>
      )}
      <button style={{...btn,marginTop:14}} disabled={saving} onClick={() => void save()}>
        {t(locale,"saveProvider")}
      </button>
      {error && <p role="alert" style={{ color: "#c22" }}>{error}</p>}
      <p style={{fontSize:12,color:"#666",marginTop:20}}>{t(locale,"credentialNote")}</p>
    </div>
  );
}
