import {expect,test} from "bun:test";
import {providerEndpoint,providerPreset,type ProviderSettings} from "../packages/agent-core/provider";
import {assertSafeHomepage} from "../packages/agent-core/multi-orchestrator";
test("models are editable and providers offer defaults",()=>{expect(providerPreset("openai").model.length).toBeGreaterThan(0);expect(providerPreset("gemini").model.length).toBeGreaterThan(0)});
test("API endpoint validation blocks unsafe credential destinations",()=>{
 const p:ProviderSettings={provider:"compatible",model:"any",apiKey:"secret",endpoint:"http://bad.test/v1/chat/completions"};
 expect(()=>providerEndpoint(p)).toThrow();
 expect(()=>providerEndpoint({...p,endpoint:"https://example.com/v1/chat/completions"})).not.toThrow();
 expect(()=>providerEndpoint({...p,endpoint:"http://localhost:11434/v1/chat/completions",apiKey:""})).not.toThrow();
});
test("reject injected browser API access",()=>{
 const code='import React from "react";export default function PersonalizedHomepage(){return <a href="https://example.com/post">Real story for today</a>;}';
 expect(assertSafeHomepage(code,["https://example.com/post"])).toContain("PersonalizedHomepage");
 expect(()=>assertSafeHomepage(code.replace("https://example.com/post","https://unverified.test"),["https://example.com/post"])).toThrow();
 expect(()=>assertSafeHomepage(code+";fetch('https://x.test')",["https://example.com/post"])).toThrow();
});
