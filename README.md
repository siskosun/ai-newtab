# AI Homepage — multi-provider edition

**Default language: Simplified Chinese (简体中文).** Setup, controls and generated homepages can switch between 简体中文, English and 日本語. See [中文版使用说明](README.zh-CN.md).

A Chrome/Edge new-tab extension derived from [ThariqS/ai-newtab](https://github.com/ThariqS/ai-newtab) (MIT License, copyright 2026 Thariq Shihipar). Upstream snapshot: `5c8d0b11c3aa5d2eab91dbc48e434233f59faa2b`. See [LICENSE](LICENSE).

## Supported model APIs

OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Qwen/DashScope, and custom OpenAI-compatible `/chat/completions` endpoints. Select a provider, enter its current **API model ID** and your own API key in Settings. Providers keep separate local configuration. Provider model identifiers in the picker are editable examples and may change or become unavailable.

This version uses a **deterministic browser-hosted pipeline** rather than Anthropic Managed Agents: rank browser history, open up to eight relevant domains in the user's signed-in browser, filter and shorten page content, call the selected provider once, validate the resulting TSX and render it in the existing Sandpack iframe. No remote agent sandbox or vendor-managed session is required. Consequently the original Anthropic resume/sandbox workflow is replaced by a fresh retry after interrupted builds. Historical authenticated page extraction and scheduled rebuilds remain, but generated layout/content may differ from the original.

## Install

Requires Node.js 20+ and a Chromium browser.

```sh
git clone https://github.com/siskosun/ai-newtab.git
cd ai-newtab
corepack enable
npx pnpm@10.11.1 install
npx pnpm@10.11.1 build
```

Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, select `apps/extension/.output/chrome-mv3`. On the new tab, select a provider, set its exact model ID and key, and choose **Build today's homepage**. Change or configure provider in **Settings**. Local OpenAI-compatible services can use `http://localhost:PORT/v1/chat/completions`; hosted services require HTTPS. API providers must allow requests from browser extension origins (CORS).

```sh
npx pnpm@10.11.1 typecheck
npx pnpm@10.11.1 test
npx pnpm@10.11.1 extension:test
```

The original Anthropic Managed Agents harness scripts remain upstream-specific reference tests; they do not validate the new multi-provider pipeline. API end-to-end checks require real user-supplied keys and credits.

## Followed websites + browsing interests

In **Settings → Websites to follow**, enter up to **four** website addresses, one per line (`example.org` or `https://example.org/section`). Explicitly followed sites are fetched first and browsing-history interests fill the remaining slots, for **eight pages maximum per build**. Only one URL per host is selected. With no subscriptions, the original history-only workflow is preserved; subscriptions also work with empty history.

URLs are normalized to HTTPS when no scheme is supplied. Query strings and fragments are removed before they are stored or loaded; credentials, private/local hosts, email/document/login destinations and user-blocked domains are rejected. This is website-page scraping, **not** an RSS parser. Saved subscriptions are local to the browser profile, but page excerpts still go to your chosen model provider. The Sources read panel identifies pages selected from followed websites vs browsing history.

This change does not add model calls, a database, or a hosted service.

## AIHOT-inspired editorial safeguards

This fork borrows **ideas**, not implementation code, from [AIHOT](https://github.com/KKKKhazix/AIHOT): source provenance, cautious event-level deduplication and avoiding false freshness. The new **Sources read** panel lists successfully loaded pages, their read times and a parameter-stripped link. Read time is *not* article publication time; these records are *not* an independent fact-check. Blocked/failed pages never appear. Existing generated homepages acquire a source list after the next successful rebuild.

The model is instructed to group only clearly identical events, link original sources, and never present undated excerpts as breaking news. These are **instructions**, not verified output guarantees. There is no heavyweight AIHOT crawler, double scoring, event database or background service in the extension.

## Privacy and limitations

Browsing-domain summaries, cleaned excerpts of up to eight pages, and user instructions are sent to the **selected model provider**, possibly including pages opened with a logged-in session. The selected provider's own retention policies apply. Blocked hosts and local/private-network hosts are filtered. Each browser profile stores keys locally in `chrome.storage.local` (accessible to users/extensions with sufficient local privileges); do not publish it to a public Chrome Web Store for shared use without a backend key proxy. Generated TSX is validated before sandboxed rendering, but it is not a formal security sandbox. Treat generated outputs as untrusted and review the privileges of any fork.

See `ARCHITECTURE.md` for the original Anthropic architecture; the multi-provider pipeline is described above.

## License

MIT — original attribution and license retained.
