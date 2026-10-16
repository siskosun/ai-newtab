import {DEFAULT_BLOCKED_SITES,isAllowedUrl,normalizeBlockList} from "./site-filter";
import type {SiteDigest} from "./types";

/**
 * A small, explicit subscription list. Keeping this at four guarantees that
 * browsing-interest sources can occupy at least four of the eight browser tabs.
 */
export const MAX_FOLLOWED_SITES = 4;
export const MAX_HOMEPAGE_SITES = 8;
export type SiteOrigin = "followed" | "history";
export interface SelectedSite {url:string;origin:SiteOrigin}
export type FollowedRejectionReason = "invalid" | "blocked" | "duplicate" | "limit";
export interface FollowedRejection {input:string;reason:FollowedRejectionReason}
export interface FollowedValidation {sites:string[];rejected:FollowedRejection[]}

/** Remove query tokens, fragments and www prefix for stable deduplication. */
function canonicalHost(url:string):string {
 return new URL(url).hostname.toLowerCase().replace(/^www\./,"");
}

/** Parse manually supplied sites; no fetch, network request or browser access. */
export function normalizeFollowedSites(
 entries:readonly string[],
 blockedSites:readonly string[]=[],
):FollowedValidation {
 const blocked=normalizeBlockList([...DEFAULT_BLOCKED_SITES,...blockedSites]);
 const sites:string[]=[];
 const rejected:FollowedRejection[]=[];
 const domains=new Set<string>();
 for (const value of entries) {
  if(typeof value!=="string")continue;
  const input=value.trim();
  if(!input||input.startsWith("#"))continue;
  if(input.length>1024 || /\s/.test(input) || input.startsWith("//")){
   rejected.push({input,reason:"invalid"});continue;
  }
  const expanded = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : "https://"+input;
  // Reject protocol-relative, unsupported and ambiguous URLs; never infer a
  // different protocol when the user explicitly typed one.
  if(!/^https?:\/\//i.test(expanded)){
   rejected.push({input,reason:"invalid"});continue;
  }
  try {
   const url=new URL(expanded);
   if(url.username||url.password){
    rejected.push({input,reason:"invalid"});continue;
   }
   if(!isAllowedUrl(url.href,blocked)){
    rejected.push({input,reason:"blocked"});continue;
   }
   url.search="";url.hash="";
   const normalized=url.href;
   const host=canonicalHost(normalized);
   if(domains.has(host)){
    rejected.push({input,reason:"duplicate"});continue;
   }
   if(sites.length>=MAX_FOLLOWED_SITES){
    rejected.push({input,reason:"limit"});continue;
   }
   domains.add(host);
   sites.push(normalized);
  }catch{
   rejected.push({input,reason:"invalid"});
  }
 }
 return {sites,rejected};
}

/** Explicit sites go first; browser history fills the remaining slots. */
export function selectHomepageSites(
 followed:readonly string[],
 history:readonly SiteDigest[],
 blockedSites:readonly string[],
):SelectedSite[] {
 const manual=normalizeFollowedSites(followed,blockedSites).sites;
 const selected:SelectedSite[]=manual.map(url=>({url,origin:"followed"}));
 const seenHosts=new Set(manual.map(canonicalHost));
 for(const site of history){
  if(selected.length>=MAX_HOMEPAGE_SITES)break;
  const url="https://"+site.domain+"/";
  if(!isAllowedUrl(url,[...blockedSites]))continue;
  const host=canonicalHost(url);
  if(seenHosts.has(host))continue;
  seenHosts.add(host);
  selected.push({url,origin:"history"});
 }
 return selected;
}
