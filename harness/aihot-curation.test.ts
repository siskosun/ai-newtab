import {expect, test} from "bun:test";
import {runMultiHomepageBuild, type BrowserBridge} from "@homepage/agent-core";

const pageTsx = 'import React from "react";export default function PersonalizedHomepage(){return <main style={{padding:24}}><h1>今日阅读摘要</h1><p>已读取可公开的网页内容。</p><a href="https://news.example.org/">查看原文来源</a></main>}';

test("AIHOT-inspired curation: only successfully read, allowed sources are persisted", async () => {
 const previous=globalThis.fetch;
 let payload:any;
 globalThis.fetch = (async (_url:unknown,init:any)=>{
   payload=JSON.parse(String(init.body));
   return new Response(JSON.stringify({choices:[{message:{content:pageTsx}}]}),{
     status:200, headers:{"content-type":"application/json"}
   });
 }) as typeof fetch;
 const visited=(domain:string)=>({
   domain,totalVisits:10,uniquePages:3,lastVisitTime:Date.now(),
   averageVisitsPerDay:2,titles:["News headlines"],urls:["https://"+domain+"/"],
   relevanceScore:domain==="news.example.org"?0.9:0.8
 });
 const bridge:BrowserBridge={
   async getHistory(){return {sites:[visited("news.example.org"),visited("redirect.example.org")],totalSitesSeen:2}},
   async getPageHtml({urls}){
     expect(urls).toEqual(["https://news.example.org/","https://redirect.example.org/"]);
     return {
       pages:[
         {url:urls[0],finalUrl:"https://news.example.org/?session=secret#part",title:"Public News",html:'<main><p>Undated news</p><a href="/">Read all</a></main>'},
         {url:urls[1],finalUrl:"https://mail.google.com/mail/u/0/",title:"PRIVATE INBOX",html:"Secret inbox details"},
       ],
       failed:[]
     };
   },
 };
 try{
   const output=await runMultiHomepageBuild({
     provider:{provider:"openai",model:"gpt-4.1-mini",apiKey:"dummy-not-real"},
     language:"zh-CN",bridge,now:new Date("2026-10-16T08:00:00.000Z")
   });
   expect(output.sources).toEqual([{
     url:"https://news.example.org/",title:"Public News",readAt:"2026-10-16T08:00:00.000Z"
   }]);
   const prompt=payload.messages[1].content as string;
   const system=payload.messages[0].content as string;
   expect(prompt).toContain('"publicationDate":null');
   expect(prompt).toContain("readAt field is observation time, NEVER publication time");
   expect(prompt).not.toContain("PRIVATE INBOX");
   expect(prompt).not.toContain("Secret inbox details");
   expect(system).toContain("Do NOT merge unrelated events");
   expect(system).toContain("read is NOT an article publication date");
   expect(system).toContain("original-source link");
   expect(output.code).toContain("今日阅读摘要");
 }finally{globalThis.fetch=previous;}
});

test("Source manifest reports no unobserved pages even when all reads fail",async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({choices:[{message:{content:'import React from "react";export default function PersonalizedHomepage(){return <main style={{padding:20}}><h1>暂无可核实内容</h1><p>暂时无法读取关注网站的页面，未展示未经核实的新闻条目。</p></main>}'}}]}),{headers:{"content-type":"application/json"}})) as unknown as typeof fetch;
 try{
  const bridge:BrowserBridge={
   async getHistory(){return {sites:[],totalSitesSeen:0}},
   async getPageHtml(){throw Error("No pages should be requested when history is empty");}
  };
  const r=await runMultiHomepageBuild({provider:{provider:"openai",model:"gpt-4.1-mini",apiKey:"dummy"},bridge});
  expect(r.sources).toEqual([]);
 }finally {globalThis.fetch=previous;}
});
