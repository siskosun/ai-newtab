import {test,expect} from "bun:test";
import {
  canReuseHomepage,fingerprintHomepage,INCREMENTAL_MAX_REUSE_MS,
  runMultiHomepageBuild,type BrowserBridge,type HomepageBuildResult,
} from "@homepage/agent-core";

const outputTsx='import React from "react";export default function PersonalizedHomepage(){return <main style={{padding:24}}><h1>阅读摘要</h1><p>这是根据成功读取的资料生成的完整首页。</p><section>所有内容仅供阅读，应以网页原文为准。</section></main>}';

test("SHA-256 fingerprint ignores read-time noise but notices material changes without storing plaintext",async()=>{
 const data={
  date:"2026-10-16",language:"zh-CN",provider:"openai",model:"test-model",
  endpoint:"",instructions:"display news",blockedSites:["blocked.example","mail.google.com"],
  followedSites:["https://news.example/"],
  selectedSites:[{url:"https://news.example/",origin:"followed" as const}],
  historyHeadlines:[],
  pages:[{url:"https://news.example/",title:"News",origin:"followed" as const,text:"An important new headline today",links:["https://news.example/story"]}],
 };
 const first=await fingerprintHomepage(data);
 expect(first).toMatch(/^v1:[a-f0-9]{64}$/);
 expect(first).not.toContain("headline");
 expect(await fingerprintHomepage({...data,blockedSites:[...data.blockedSites].reverse()})).toBe(first);
 expect(await fingerprintHomepage({...data,pages:[{...data.pages[0],text:"An important new headline tomorrow"}]})).not.toBe(first);
 expect(await fingerprintHomepage({...data,instructions:"display games"})).not.toBe(first);
 expect(await fingerprintHomepage({...data,date:"2026-10-17"})).not.toBe(first);
 expect(await fingerprintHomepage({...data,selectedSites:[{url:"https://news.example/",origin:"history"}]})).not.toBe(first);
});
test("reuse requires complete coverage, valid age, matching fingerprint and no clock reversal",()=>{
 const base={previousFingerprint:"v1:abc",currentFingerprint:"v1:abc",generatedAt:"2026-10-16T08:00:00.000Z",checkedAt:new Date("2026-10-16T14:00:00.000Z"),coverageComplete:true};
 expect(canReuseHomepage(base)).toBe(true);
 expect(canReuseHomepage({...base,coverageComplete:false})).toBe(false);
 expect(canReuseHomepage({...base,currentFingerprint:"v1:other"})).toBe(false);
 expect(canReuseHomepage({...base,generatedAt:"bad-date"})).toBe(false);
 expect(canReuseHomepage({...base,checkedAt:new Date("2026-10-16T07:59:00.000Z")})).toBe(false);
 expect(canReuseHomepage({...base,checkedAt:new Date(Date.parse(base.generatedAt)+INCREMENTAL_MAX_REUSE_MS)})).toBe(false);
});
test("unchanged automatic checks skip model once; real updates, settings, date and failures force generation",async()=>{
 const original=globalThis.fetch;
 let calls=0;
 let html='Headline A from the latest selected page';
 let failed=false;
 let headline='Recent headline';
 globalThis.fetch=(async(_url:unknown,_options:any)=>{
  calls++;
  return new Response(JSON.stringify({choices:[{message:{content:outputTsx}}]}),{headers:{"content-type":"application/json"}});
 }) as typeof fetch;
 const bridge:BrowserBridge={
  async getHistory(){
   return {sites:[{
    domain:"news.example.org",totalVisits:15,uniquePages:5,
    lastVisitTime:Date.parse("2026-10-16T00:00:00.000Z"),
    averageVisitsPerDay:2,titles:[headline],urls:["https://news.example.org/"],relevanceScore:.95,
   }],totalSitesSeen:1};
  },
  async getPageHtml({urls}){
   expect(urls).toEqual(["https://news.example.org/"]);
   if(failed)return {pages:[],failed:[{url:urls[0],reason:"read error"}]};
   return {pages:[{url:urls[0],title:"News",html:"<main><h1>"+html+"</h1><p>Article details.</p></main>"}],failed:[]};
  },
 };
 const at=(hour:number,day=16)=>new Date(`2026-10-${day}T${String(hour).padStart(2,"0")}:00:00.000Z`);
 const common={
  provider:{provider:"openai" as const,apiKey:"offline-key",model:"test-model"},
  bridge,
  language:"zh-CN" as const,
 };
 let initial:HomepageBuildResult;
 try {
  initial=await runMultiHomepageBuild({...common,now:at(8)});
  expect(initial.unchanged).toBe(false);
  expect(initial.fingerprint).toMatch(/^v1:[0-9a-f]{64}$/);
  expect(calls).toBe(1);
  const cache={fingerprint:initial.fingerprint!,generatedAt:initial.checkedAt!,code:initial.code,sources:initial.sources};
  const noChange=await runMultiHomepageBuild({...common,now:at(14),incrementalCache:cache});
  expect(noChange.unchanged).toBe(true);
  expect(noChange.code).toBe(initial.code);
  expect(noChange.sources).toEqual(initial.sources);
  expect(noChange.checkedAt).toBe("2026-10-16T14:00:00.000Z");
  expect(calls).toBe(1);
  // Explicit manual rebuilds do not pass a cache.
  const manual=await runMultiHomepageBuild({...common,now:at(14)});
  expect(manual.unchanged).toBe(false);
  expect(calls).toBe(2);
  // An actual page headline change is always material.
  html='Headline B: policy changed in material ways';
  expect((await runMultiHomepageBuild({...common,now:at(14),incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(3);
  html='Headline A from the latest selected page';
  // Browser interest changes are visible without relying on visit counters.
  headline='A newly interesting article about changing priorities';
  expect((await runMultiHomepageBuild({...common,now:at(14),incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(4);
  headline='Recent headline';
  // User intent/model configuration requires a rebuild.
  expect((await runMultiHomepageBuild({...common,now:at(14),userSystemPrompt:"different layout",incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(5);
  expect((await runMultiHomepageBuild({...common,now:at(14),provider:{...common.provider,model:"different-model"},incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(6);
  expect((await runMultiHomepageBuild({...common,now:at(14),blockedSites:["unused.example"],incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(7);
  // Generated headlines can include "today"; no reuse past date rollover.
  expect((await runMultiHomepageBuild({...common,now:at(2,17),incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(8);
  // A failed read may NOT be interpreted as a successful no-change.
  failed=true;
  expect((await runMultiHomepageBuild({...common,now:at(14),incrementalCache:cache})).unchanged).toBe(false);
  expect(calls).toBe(9);
 }finally{globalThis.fetch=original;}
});
