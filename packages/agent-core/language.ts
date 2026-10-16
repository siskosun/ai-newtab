/** UI and generated-content language choices. Do not infer from browser location. */
export const HOMEPAGE_LANGUAGES = [
  {id:"zh-CN",label:"简体中文"},
  {id:"en",label:"English"},
  {id:"ja",label:"日本語"},
] as const;
export type HomepageLanguage = (typeof HOMEPAGE_LANGUAGES)[number]["id"];
export const DEFAULT_HOMEPAGE_LANGUAGE: HomepageLanguage = "zh-CN";
export function normalizeHomepageLanguage(value: unknown): HomepageLanguage {
  return HOMEPAGE_LANGUAGES.some(option => option.id === value)
    ? value as HomepageLanguage
    : DEFAULT_HOMEPAGE_LANGUAGE;
}
export function homepageLanguageInstruction(language: HomepageLanguage): string {
  switch (normalizeHomepageLanguage(language)) {
    case "en":
      return "Render all visible headlines, summaries, navigation labels, dates, warnings and fallback states in natural English. Summarize non-English pages faithfully in English. Keep proper names, model names, URLs and technical identifiers unchanged.";
    case "ja":
      return "表示される見出し・要約・ナビゲーション・日付・注意書き・代替メッセージはすべて自然な日本語で書いてください。外国語のページは事実を補わず日本語で要約し、固有名詞・URL・技術的な識別子は維持してください。日本語で読みやすいフォントと組版を使用してください。";
    default:
      return "生成页面中所有可见文字（栏目标题、导航、新闻摘要、日期、提示和缺失信息说明）必须使用自然、准确的中国大陆简体中文。英文及其他语言网页应忠实概括为中文，不得添加原文不存在的事实。保留品牌、专有名词、技术标识和原始链接，不翻译或改写 URL。采用适合中文阅读的字体、行高与信息密度。";
  }
}
