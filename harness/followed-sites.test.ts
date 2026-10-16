import {test,expect} from "bun:test";
import {
 MAX_FOLLOWED_SITES,MAX_HOMEPAGE_SITES,normalizeFollowedSites,selectHomepageSites,
 runMultiHomepageBuild,type BrowserBridge,type SiteDigest,
} from "@homepage/agent-core";

function digest(domain:string,score:number):SiteDigest {
 return {domain,visits:20,pages:4,lastVisit:"2026-10-16T08:00:00.000Z",score,sampleTitles:["Today"]};
}

test("subscriptions accept domains/sections, sanitize URLs and reject duplicates, unsafe and private sites",()=>{
 const result=normalizeFollowedSites([
  "https://www.example.org/news?access_token=SECRET#article",
  "example.org/another", // same website, avoids duplicate scraping
  "  news.example.net  ",
  "https://mail.google.com/mail/u/0/",
  "http://localhost:8080/",
  "file:///etc/passwd",
  "https://user:pass@public.example/",
  "https://valid.example/", 
 ],[]);
 expect(result.sites).toEqual(["https://www.example.org/news","https://news.example.net/","https://valid.example/"]);
 expect(result.rejected.map(x=>x.reason)).toEqual(["duplicate","blocked","blocked","invalid","invalid"]);
 expect(result.sites.join(" ")).not.toContain("SECRET");
 expect(normalizeFollowedSites(["https://blocked.example/", "https://good.example/"],["blocked.example"]).sites).toEqual(["https://good.example/"]);
 expect(normalizeFollowedSites(["http://intranet/", "https://127.0.0.1:1999/"]).sites).toEqual([]);
});

test("subscriptions stay bounded and history fills the remaining slots in order",()=>{
 const followed=["a.example","b.example","c.example","d.example","e.example"];
 const validated=normalizeFollowedSites(followed);
 expect(validated.sites).toHaveLength(MAX_FOLLOWED_SITES);
 expect(validated.rejected).toEqual([{input:"e.example",reason:"limit"}]);
 const history=[
  digest("b.example",1),digest("f.example",.9),digest("g.example",.8),
  digest("h.example",.7),digest("i.example",.6),digest("j.example",.5),
 ];
 const selected=selectHomepageSites(validated.sites,history,[]);
 expect(selected).toHaveLength(MAX_HOMEPAGE_SITES);
 expect(selected.slice(0,4).map(x=>x.origin)).toEqual(["followed","followed","followed","followed"]);
 expect(selected.slice(4).map(x=>x.url)).toEqual([
  "https://f.example/","https://g.example/","https://h.example/","https://i.example/",
 ]);
 expect(selectHomepageSites([],history,[]).every(x=>x.origin==="history")).toBe(true);
 expect(selectHomepageSites(["a.example"],[],[])).toEqual([{url:"https://a.example/",origin:"followed"}]);
});

test("manual URLs are fetched before discovered sites without duplicate domains or extra model calls",async()=>{
 const existing=globalThis.fetch;
 let calls=0;
 let sent:any;
 const component='import React from "react";export default function PersonalizedHomepage(){return <main style={{padding:24}}><h1>今天的阅读</h1><p>内容仅来自实际读取的网站，不代表新闻一定是在今天发布。</p><a href="https://science.example.org/topic">查看原文</a></main>}';
 globalThis.fetch=(async (_url:any,init:any)=>{
  calls++;
  sent=JSON.parse(String(init.body));
  return new Response(JSON.stringify({choices:[{message:{content:component}}]}),{
   status:200,headers:{"content-type":"application/json"}
  });
 }) as typeof fetch;
 const got:string[][]=[];
 const bridge:BrowserBridge={
  async getHistory(){
   return {sites:[
    {domain:"science.example.org",totalVisits:30,uniquePages:2,lastVisitTime:Date.now(),averageVisitsPerDay:3,titles:["a"],urls:["https://science.example.org/"],relevanceScore:.9},
    {domain:"other.example.org",totalVisits:20,uniquePages:4,lastVisitTime:Date.now(),averageVisitsPerDay:2,titles:["b"],urls:["https://other.example.org/"],relevanceScore:.8},
   ],totalSitesSeen:2};
  },
  async getPageHtml({urls}){
   got.push(urls);
   return {pages:urls.map((url,index)=>({url,title:"Read "+index,html:'<main>Available information from source</main><a href="/topic">Read more</a>'})),failed:[]};
  },
 };
 try{
  const output=await runMultiHomepageBuild({
   provider:{provider:"openai",apiKey:"dummy",model:"gpt-4.1-mini"},
   followedSites:["science.example.org/topic?session=SECRET#frag","https://manual.example.org/"],
   bridge,blockedSites:[],now:new Date("2026-10-16T08:00:00.000Z"),
  });
  expect(calls).toBe(1);
  expect(got).toEqual([[
   "https://science.example.org/topic",
   "https://manual.example.org/",
   "https://other.example.org/",
  ]]);
  expect(output.sources?.map(x=>x.origin)).toEqual(["followed","followed","history"]);
  expect(sent.messages[1].content).toContain("SOURCE_SELECTION");
  expect(sent.messages[1].content).toContain('"origin":"followed"');
  expect(sent.messages[1].content).not.toContain("SECRET");
 }finally{globalThis.fetch=existing;}
});

test("subscribed sites remain blocked when they are manually excluded",async()=>{
 const parsed=normalizeFollowedSites(["allowed.example","drive.google.com","private.example"],["private.example"]);
 expect(parsed.sites).toEqual(["https://allowed.example/"]);
 expect(parsed.rejected.map(x=>x.reason)).toEqual(["blocked","blocked"]);
});
