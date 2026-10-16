import {test,expect} from "bun:test";
import {
  DEFAULT_HOMEPAGE_LANGUAGE,HOMEPAGE_LANGUAGES,normalizeHomepageLanguage,
  homepageLanguageInstruction,isKeylessLocalProvider,runMultiHomepageBuild,
  type BrowserBridge,
} from "@homepage/agent-core";
import {t,describeBuildError} from "../apps/extension/lib/i18n";

test("Chinese is the explicit default and unknown settings fall back safely",()=>{
 expect(DEFAULT_HOMEPAGE_LANGUAGE).toBe("zh-CN");
 expect(normalizeHomepageLanguage(undefined)).toBe("zh-CN");
 expect(normalizeHomepageLanguage("fr-FR")).toBe("zh-CN");
 expect(HOMEPAGE_LANGUAGES.map(x=>x.id)).toEqual(["zh-CN","en","ja"]);
 expect(homepageLanguageInstruction("zh-CN")).toContain("简体中文");
 expect(homepageLanguageInstruction("en")).toContain("English");
 expect(homepageLanguageInstruction("ja")).toContain("日本語");
});
test("all UI languages contain meaningful translated labels and errors",()=>{
 expect(t("zh-CN","buildToday")).toBe("生成今日首页");
 expect(t("en","buildToday")).toBe("Build today's homepage");
 expect(t("ja","buildToday")).toContain("生成");
 expect(t("zh-CN","settings")).toBe("设置");
 expect(t("zh-CN","endpoint")).toContain("接口");
 expect(describeBuildError("zh-CN","Model request failed: NetworkError")).toContain("模型连接失败");
});
test("local API endpoint may omit a key without permitting insecure remote hosts",()=>{
 expect(isKeylessLocalProvider("compatible","http://localhost:11434/v1/chat/completions")).toBe(true);
 expect(isKeylessLocalProvider("compatible","http://127.0.0.1:1234/v1/chat/completions")).toBe(true);
 expect(isKeylessLocalProvider("compatible","http://remote.test/v1/chat/completions")).toBe(false);
 expect(isKeylessLocalProvider("openai","http://localhost:11434/v1/chat/completions")).toBe(false);
});
test("real orchestration request receives a trusted Chinese locale and original links",async()=>{
 const previous=globalThis.fetch;
 let request:any;
 let requestUrl="";
 const tsx='import React from "react"; export default function PersonalizedHomepage(){return <main style={{padding:20}}><h1>今日资讯与技术动态</h1><a href="https://example.com/story">从英文原文整理的中文新闻摘要</a><p>内容来自已读取的网页，点击链接可查看原文。</p></main>}';
 globalThis.fetch=(async(url:unknown,options:any)=>{
  requestUrl=String(url);
  request=JSON.parse(String(options.body));
  return new Response(JSON.stringify({choices:[{message:{content:tsx}}]}),{status:200,headers:{"content-type":"application/json"}});
 }) as typeof fetch;
 const browserBridge:BrowserBridge={
  async getHistory(){return {sites:[{
   domain:"example.com",totalVisits:15,uniquePages:4,
   lastVisitTime:Date.now(),averageVisitsPerDay:1,
   titles:["English science news"],urls:["https://example.com/story"],relevanceScore:0.9,
  }],totalSitesSeen:1}},
  async getPageHtml({urls}){
   expect(urls).toEqual(["https://example.com/"]);
   return {pages:[{
    url:"https://example.com/",finalUrl:"https://example.com/",
    title:"English science news",
    html:'<h1>Latest research news</h1><p>A new result is announced.</p><a href="/story">Read source</a>',
   }],failed:[]};
  },
 };
 try {
  const result=await runMultiHomepageBuild({
   provider:{provider:"openai",apiKey:"not-a-real-key",model:"gpt-4.1-mini"},
   language:"zh-CN",bridge:browserBridge,now:new Date("2026-10-16T08:00:00Z"),
  });
  expect(result.code).toContain("从英文原文整理的中文新闻摘要");
  expect(requestUrl).toBe("https://api.openai.com/v1/chat/completions");
  expect(request.messages[0].content).toContain("简体中文");
  expect(request.messages[1].content).toContain("Required user-visible language: zh-CN");
  expect(request.messages[1].content).toContain("https://example.com/story");
 }finally {globalThis.fetch=previous;}
});
