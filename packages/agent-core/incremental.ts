/**
 * Conservative, local-only digest of the *effective* inputs to one generated
 * homepage. Nothing besides a SHA-256 digest is stored in the homepage cache:
 * no scraped text, browsing history or secret API credentials.
 *
 * This is a cost guard, NOT a freshness/quality classifier. It intentionally
 * errs on the side of calling the model when content is uncertain.
 */
export const INCREMENTAL_FINGERPRINT_VERSION = "v1";
export const INCREMENTAL_MAX_REUSE_MS = 24 * 60 * 60 * 1000;

export interface FingerprintPage {
  url: string;
  title: string;
  origin: "followed" | "history";
  text: string;
  links: string[];
}
export interface FingerprintInput {
  date: string;
  language: string;
  provider: string;
  model: string;
  endpoint: string;
  instructions: string;
  blockedSites: string[];
  followedSites: string[];
  selectedSites: {url: string;origin: "followed" | "history"}[];
  historyHeadlines: {domain: string;sampleTitles: string[]}[];
  pages: FingerprintPage[];
}
export async function fingerprintHomepage(input:FingerprintInput):Promise<string> {
  const canonical=JSON.stringify({
    version:INCREMENTAL_FINGERPRINT_VERSION,
    ...input,
    blockedSites:[...input.blockedSites].sort(),
    // Deliberately omit read time, visit counts and changing visit scores.
    // Dates are included because the generated page may show "today".
  });
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical));
  return INCREMENTAL_FINGERPRINT_VERSION + ":" +
    Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
}
export function canReuseHomepage({
  previousFingerprint, currentFingerprint, generatedAt, checkedAt,
  coverageComplete,
}:{
  previousFingerprint?:string;
  currentFingerprint?:string;
  generatedAt?:string;
  checkedAt:Date;
  coverageComplete:boolean;
}):boolean {
  if(!coverageComplete || !currentFingerprint ||
     !previousFingerprint || currentFingerprint!==previousFingerprint ||
     !currentFingerprint.startsWith(INCREMENTAL_FINGERPRINT_VERSION+":"))return false;
  if(!generatedAt || !Number.isFinite(checkedAt.getTime()))return false;
  const age=checkedAt.getTime()-Date.parse(generatedAt);
  return Number.isFinite(age) && age>=0 && age<INCREMENTAL_MAX_REUSE_MS;
}
