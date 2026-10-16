import {useState} from "react";
import {PROVIDERS,providerPreset,type ProviderId} from "@homepage/agent-core";
import {btn} from "./ui";
export function ApiKeySetup({onSave}:{onSave:(key:string,provider:ProviderId,model:string)=>void}){
 const [provider,setProvider]=useState<ProviderId>("openai");
 const [model,setModel]=useState<string>(providerPreset("openai").model);
 const [key,setKey]=useState("");
 return <div style={{maxWidth:540,margin:"12vh auto",padding:24,fontFamily:"system-ui"}}>
 <h1>Connect your AI provider</h1><p>Choose a model provider. Your API key stays in Chrome local storage. Your browsing excerpts are sent to its API when you rebuild.</p>
 <select value={provider} onChange={e=>{const p=e.target.value as ProviderId;setProvider(p);setModel(providerPreset(p).model);setKey("")}} style={{display:"block",padding:10,width:"100%",marginBottom:12}}>{PROVIDERS.filter(p=>p.id!=="compatible").map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select>
 <input value={model} onChange={e=>setModel(e.target.value)} placeholder="Model ID" style={{display:"block",width:"100%",boxSizing:"border-box",padding:10,marginBottom:12}}/>
 <input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="API key" style={{display:"block",width:"100%",boxSizing:"border-box",padding:10}}/>
 <button style={{...btn,marginTop:14}} disabled={!key.trim()||!model.trim()} onClick={()=>onSave(key.trim(),provider,model.trim())}>Save provider</button>
 <p style={{fontSize:12,color:"#666"}}>For custom OpenAI-compatible endpoints, first connect a provider then open Settings.</p>
 </div>;
}