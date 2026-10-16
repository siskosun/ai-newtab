import { DEFAULT_PROVIDER, DEFAULT_PROVIDER_MODEL, providerPreset, isProviderId, DEFAULT_HOMEPAGE_LANGUAGE, normalizeHomepageLanguage, type HomepageLanguage, type ProviderId } from "@homepage/agent-core";
import {
  DEFAULT_BLOCKED_SITES,
  STORAGE_KEYS as AGENT_KEYS,
  type KVStore,
} from "@homepage/agent-core";

/**
 * Everything the extension persists, in one place. All of it lives in
 * chrome.storage.local — including the API key, which anyone with access to the
 * browser profile can read. Fine for a tool you run yourself; not for one you
 * distribute (see ARCHITECTURE.md → Privacy).
 */
export const KEYS = {
  ...AGENT_KEYS,
  homepage: "homepageData",
  systemPrompt: "systemPrompt",
  blockedSites: "blockedSites",
  model: "model",
  provider: "provider",
  endpoint: "endpoint",
  credentials: "providerCredentials",
  locale: "homepageLanguage",
  autoRebuild: "autoRebuild",
  /** ISO timestamp of the last auto-build *attempted* (success or not). */
  lastAutoBuildAttempt: "lastAutoBuildAttempt",
  rebuildIntervalHours: "autoRebuildIntervalHours",
  /** Throttled mirror of the live build state, for tabs that open while the worker sleeps. */
  buildSnapshot: "buildSnapshot",
} as const;

export interface Homepage {
  /** The agent's raw TSX source. */
  code: string;
  /** ISO timestamp of when it was built. */
  timestamp: string;
}

export interface Settings {
  apiKey: string | null;
  systemPrompt: string;
  blockedSites: string[];
  model: string;
  provider: ProviderId;
  endpoint: string;
  locale: HomepageLanguage;
  /** Unset means on — auto-rebuild is opt-out. */
  autoRebuild: boolean;
  rebuildIntervalHours: number | null;
}

/** The `KVStore` agent-core persists its agent/environment/session IDs through. */
export const extensionStore: KVStore = {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

export async function loadSettings(): Promise<Settings> {
  const s = await browser.storage.local.get([
    KEYS.apiKey,
    KEYS.systemPrompt,
    KEYS.blockedSites,
    KEYS.model,
    KEYS.provider,
    KEYS.endpoint,
    KEYS.credentials,
    KEYS.locale,
    KEYS.autoRebuild,
    KEYS.rebuildIntervalHours,
  ]);
  const provider = isProviderId(s[KEYS.provider]) ? s[KEYS.provider] as ProviderId : DEFAULT_PROVIDER;
  const credentials = (s[KEYS.credentials] as Record<string,{apiKey:string;model:string;endpoint:string}> | undefined) ?? {};
  const selected = credentials[provider];
  const legacyKey = (s[KEYS.apiKey] as string | undefined) ?? null;
  const legacyModel = s[KEYS.model] as string | undefined;
  return {
    apiKey: selected?.apiKey ?? (provider === DEFAULT_PROVIDER ? legacyKey : null),
    systemPrompt: (s[KEYS.systemPrompt] as string | undefined) ?? "",
    blockedSites: (s[KEYS.blockedSites] as string[] | undefined) ?? [...DEFAULT_BLOCKED_SITES],
    // Fall back if a stored model is no longer offered.
    model: selected?.model ?? (provider === DEFAULT_PROVIDER ? (legacyModel ?? DEFAULT_PROVIDER_MODEL) : providerPreset(provider).model),
    provider,
    endpoint: selected?.endpoint ?? (s[KEYS.endpoint] as string | undefined) ?? "",
    locale: normalizeHomepageLanguage(s[KEYS.locale] ?? DEFAULT_HOMEPAGE_LANGUAGE),
    autoRebuild: s[KEYS.autoRebuild] !== false,
    rebuildIntervalHours: (s[KEYS.rebuildIntervalHours] as number | undefined) ?? null,
  };
}

export async function saveSetting<K extends "apiKey" | "systemPrompt" | "blockedSites" | "model" | "provider" | "endpoint" | "locale" | "autoRebuild" | "rebuildIntervalHours">(
  key: K,
  value: Settings[K],
): Promise<void> {
  await browser.storage.local.set({ [KEYS[key]]: value });
}

export async function loadHomepage(): Promise<Homepage | undefined> {
  return extensionStore.get<Homepage>(KEYS.homepage);
}

export async function saveHomepage(code: string): Promise<void> {
  const homepage: Homepage = { code, timestamp: new Date().toISOString() };
  await extensionStore.set(KEYS.homepage, homepage);
}

export async function saveProviderConfiguration(provider: ProviderId, apiKey:string, model:string, endpoint:string):Promise<void>{
  const old=await browser.storage.local.get(KEYS.credentials);
  const profiles=(old[KEYS.credentials] as Record<string,{apiKey:string;model:string;endpoint:string}>|undefined)??{};
  await browser.storage.local.set({[KEYS.credentials]:{...profiles,[provider]:{apiKey,model,endpoint}},[KEYS.provider]:provider});
}
