import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PROVIDER_MODEL, DEFAULT_BLOCKED_SITES, DEFAULT_PROVIDER,
  type ProviderId, type HomepageLanguage, type ReadSource, isKeylessLocalProvider,
} from "@homepage/agent-core";
import { DEFAULT_REBUILD_INTERVAL_HOURS } from "@/lib/auto-rebuild";
import { BUILD_STEPS } from "@/lib/protocol";
import {
  DEFAULT_HOMEPAGE_LANGUAGE, describeBuildError, t,
} from "@/lib/i18n";
import {
  KEYS, extensionStore, loadHomepage, loadSettings, saveSetting, saveProviderConfiguration,
} from "@/lib/storage";
import { toRenderable } from "@/lib/transpile";
import { ApiKeySetup } from "./components/ApiKeySetup";
import { BuildProgress } from "./components/BuildProgress";
import { HomepagePreview } from "./components/HomepagePreview";
import { SettingsModal } from "./components/SettingsModal";
import { SourcesPanel } from "./components/SourcesPanel";
import { btn, errorBox } from "./components/ui";
import { useHomepageBuild } from "./useHomepageBuild";

interface ModelConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  endpoint: string;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [blockedSites, setBlockedSites] = useState<string[]>(DEFAULT_BLOCKED_SITES);
  const [followedSites, setFollowedSites] = useState<string[]>([]);
  const [model, setModel] = useState<string>(DEFAULT_PROVIDER_MODEL);
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [endpoint, setEndpoint] = useState("");
  const [locale, setLocale] = useState<HomepageLanguage>(DEFAULT_HOMEPAGE_LANGUAGE);
  const [autoRebuild, setAutoRebuild] = useState(true);
  const [intervalHours, setIntervalHours] = useState(DEFAULT_REBUILD_INTERVAL_HOURS);
  const [renderedCode, setRenderedCode] = useState<string | null>(null);
  const [resumable, setResumable] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<ReadSource[]>([]);
  const [viewProgress, setViewProgress] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const { state, build, cancel } = useHomepageBuild((code, sourcesRead) => {
    setRenderedCode(toRenderable(code));
    setSources(sourcesRead);
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(locale, "homepageTitle");
  }, [locale]);

  useEffect(() => {
    if (!state.running) setViewProgress(false);
  }, [state.running]);

  useEffect(() => {
    (async () => {
      try {
        const [settings, homepage, activeSession] = await Promise.all([
          loadSettings(), loadHomepage(), extensionStore.get<string>(KEYS.activeSessionId),
        ]);
        setApiKey(settings.apiKey);
        setSystemPrompt(settings.systemPrompt);
        setBlockedSites(settings.blockedSites);
        setFollowedSites(settings.followedSites);
        setModel(settings.model);
        setProvider(settings.provider);
        setEndpoint(settings.endpoint);
        setLocale(settings.locale);
        setAutoRebuild(settings.autoRebuild);
        setIntervalHours(settings.rebuildIntervalHours ?? DEFAULT_REBUILD_INTERVAL_HOURS);
        setResumable(activeSession ?? null);
        if (homepage?.code) {
          setRenderedCode(toRenderable(homepage.code));
          setSources(homepage.sources ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const changeLanguage = useCallback(async (next: HomepageLanguage) => {
    await saveSetting("locale", next);
    setLocale(next);
  }, []);

  const saveKey = useCallback(async (key: string, chosenProvider: ProviderId, chosenModel: string, chosenEndpoint: string) => {
    await saveProviderConfiguration(chosenProvider, key, chosenModel, chosenEndpoint);
    setApiKey(key);
    setProvider(chosenProvider);
    setModel(chosenModel);
    setEndpoint(chosenEndpoint);
  }, []);

  const saveConfig = useCallback(async (
    prompt: string, sites: string[], followed: string[], config: ModelConfig, nextLanguage: HomepageLanguage,
  ) => {
    await Promise.all([
      saveSetting("systemPrompt", prompt),
      saveSetting("blockedSites", sites),
      saveSetting("followedSites", followed),
      saveSetting("locale", nextLanguage),
      saveProviderConfiguration(config.provider, config.apiKey, config.model, config.endpoint),
    ]);
    setSystemPrompt(prompt);
    setBlockedSites(sites);
    setFollowedSites(followed);
    setProvider(config.provider);
    setModel(config.model);
    setApiKey(config.apiKey);
    setEndpoint(config.endpoint);
    setLocale(nextLanguage);
    setShowSettings(false);
    // Keep the last successful page if the rebuild fails.
    setViewProgress(true);
    build();
  }, [build]);

  const toggleAutoRebuild = useCallback(async (next: boolean) => {
    setAutoRebuild(next);
    await saveSetting("autoRebuild", next);
  }, []);
  const changeInterval = useCallback(async (next: number) => {
    setIntervalHours(next);
    await saveSetting("rebuildIntervalHours", next);
  }, []);

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}>{t(locale, "loading")}</div>;
  if (!apiKey && !isKeylessLocalProvider(provider, endpoint)) return (
    <ApiKeySetup locale={locale} onChangeLocale={changeLanguage} onSave={saveKey} />
  );

  if (state.running && (!renderedCode || viewProgress)) {
    return (
      <BuildProgress
        locale={locale}
        state={state}
        onCancel={cancel}
        onBack={renderedCode ? () => setViewProgress(false) : undefined}
      />
    );
  }

  if (!renderedCode) return (
    <div style={{ maxWidth: 560, margin: "14vh auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 26 }}>{t(locale, "homepageTitle")}</h1>
      <p style={{ color: "#555", lineHeight: 1.7 }}>{t(locale, "homepageIntro")}</p>
      {state.error && (
        <div role="alert" style={{ ...errorBox, margin: "16px 0", padding: 12, borderRadius: 4 }}>
          {describeBuildError(locale, state.error)}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <button style={btn} onClick={() => build()}>{t(locale, "buildToday")}</button>
        {resumable && (
          <button style={{ ...btn, backgroundColor: "#555" }} onClick={() => build({ resume: true })}>
            {t(locale, "resumeBuild")}
          </button>
        )}
        <button style={{ ...btn, backgroundColor: "#555" }} onClick={() => setShowSettings(true)}>
          {t(locale, "settings")}
        </button>
      </div>
      {showSettings && (
        <SettingsModal
          initialPrompt={systemPrompt}
          blockedSites={blockedSites}
          followedSites={followedSites}
          model={model} provider={provider} apiKey={apiKey ?? ""} endpoint={endpoint}
          locale={locale} autoRebuild={autoRebuild}
          onToggleAutoRebuild={toggleAutoRebuild}
          intervalHours={intervalHours} onChangeInterval={changeInterval}
          onClose={() => setShowSettings(false)} onSave={saveConfig}
        />
      )}
    </div>
  );

  const showError = state.error && dismissedError !== state.error;

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {state.running ? (
          <button
            style={{ ...btn, backgroundColor: "#0a7" }}
            onClick={() => setViewProgress(true)}
            title={t(locale, "progressTitle")}
          >
            {t(locale, "building")} {Math.min(state.stepIndex + 1, BUILD_STEPS.length)}/{BUILD_STEPS.length}
          </button>
        ) : (
          <button style={btn} onClick={() => build()} title={t(locale, "rebuild")}>
            {t(locale, "rebuild")}
          </button>
        )}
        {sources.length > 0 && (
          <button style={btn} onClick={() => setShowSources(true)} title={t(locale, "readSourceTitle")}>
            {t(locale, "sources")} · {sources.length}
          </button>
        )}
        <button style={btn} onClick={() => setShowSettings(true)} title={t(locale, "settings")}>
          {t(locale, "settings")}
        </button>
      </div>

      {showError && (
        <div
          role="alert"
          style={{
            ...errorBox, position: "fixed", top: 20, left: 20, right: 260,
            zIndex: 999, padding: "10px 14px", borderRadius: 6,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}
        >
          <span style={{ flex: 1 }}>
            <b>{t(locale, "buildFailed")}</b> {describeBuildError(locale, state.error!)}
          </span>
          <button style={{ ...btn, padding: "4px 10px", backgroundColor: "#a02620" }} onClick={() => build()}>
            {t(locale, "retry")}
          </button>
          <button
            onClick={() => setDismissedError(state.error)}
            style={{ background: "transparent", border: "none", color: "#a02620", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            title={t(locale, "dismiss")}
            aria-label={t(locale, "dismiss")}
          >×</button>
        </div>
      )}

      <HomepagePreview code={renderedCode} locale={locale} />

      {showSources && <SourcesPanel sources={sources} locale={locale} onClose={() => setShowSources(false)} />}

      {showSettings && (
        <SettingsModal
          initialPrompt={systemPrompt}
          blockedSites={blockedSites}
          followedSites={followedSites}
          model={model} provider={provider} apiKey={apiKey ?? ""} endpoint={endpoint}
          locale={locale} autoRebuild={autoRebuild}
          onToggleAutoRebuild={toggleAutoRebuild}
          intervalHours={intervalHours} onChangeInterval={changeInterval}
          onClose={() => setShowSettings(false)} onSave={saveConfig}
        />
      )}
    </div>
  );
}
