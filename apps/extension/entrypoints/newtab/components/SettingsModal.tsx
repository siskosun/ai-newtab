import {useState,useEffect} from "react";
import {PROVIDERS,providerPreset,type ProviderId,normalizeBlockList} from "@homepage/agent-core";
import {REBUILD_INTERVAL_CHOICES} from "@/lib/auto-rebuild";
import {loadSettings,saveProviderConfiguration} from "@/lib/storage";
import {btn} from "./ui";
export function SettingsModal({initialPrompt,blockedSites,provider,model,apiKey,endpoint,autoRebuild,onToggleAutoRebuild,intervalHours,onChangeInterval,onClose,onSave}:{
 initialPrompt:string;blockedSites:string[];provider:ProviderId;model:string;apiKey:string;endpoint:string;
 autoRebuild:boolean;onToggleAutoRebuild:(v:boolean)=>void;intervalHours:number;onChangeInterval:(v:number)=>void;
 onClose:()=>void;onSave:(p:string,b:string[],config:{provider:ProviderId;model:string;apiKey:string;endpoint:string})=>void;
}){
 const [draft,setDraft]=useState(initialPrompt);
 const [blockedDraft,setBlockedDraft]=useState(blockedSites.join("\n"));
 const [providerDraft,setProviderDraft]=useState<ProviderId>(provider);
 const [modelDraft,setModelDraft]=useState(model);
 const [keyDraft,setKeyDraft]=useState(apiKey);
 const [endpointDraft,setEndpointDraft]=useState(endpoint);
 const [error,setError]=useState("");
 async function choose(next:ProviderId){
   setProviderDraft(next);
   const stored=await browser.storage.local.get("providerCredentials");
   const profiles=stored.providerCredentials as Record<string,{apiKey:string;model:string;endpoint:string}>|undefined;
   const selected=profiles?.[next];
   setModelDraft(selected?.model ?? providerPreset(next).model);
   setKeyDraft(selected?.apiKey ?? "");
   setEndpointDraft(selected?.endpoint ?? "");
 }
 async function save(){
  if(!modelDraft.trim()){setError("Model ID is required.");return}
  if(providerDraft==="compatible" && !endpointDraft.trim()){setError("Endpoint URL is required.");return}
  if(!keyDraft.trim() && !(providerDraft==="compatible" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(endpointDraft))){setError("API key is required.");return}
  await saveProviderConfiguration(providerDraft,keyDraft.trim(),modelDraft.trim(),endpointDraft.trim());
  onSave(draft,normalizeBlockList(blockedDraft.split("\n")),{provider:providerDraft,model:modelDraft.trim(),apiKey:keyDraft.trim(),endpoint:endpointDraft.trim()});
 }
 return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
 <div style={{width:"min(620px,94vw)",maxHeight:"94vh",overflowY:"auto",padding:24,background:"#fff",borderRadius:12,color:"#222",fontFamily:"system-ui"}}>
 <h2>Customize your homepage</h2>
 <label style={{display:"block",marginTop:14}}>Provider<select value={providerDraft} onChange={e=>void choose(e.target.value as ProviderId)} style={{display:"block",width:"100%",padding:9,marginTop:6}}>{PROVIDERS.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
 <label style={{display:"block",marginTop:14}}>Model ID<input value={modelDraft} onChange={e=>setModelDraft(e.target.value)} style={{display:"block",width:"100%",padding:9,boxSizing:"border-box"}} placeholder="Model name from your provider"/></label>
 <label style={{display:"block",marginTop:14}}>API key<input type="password" autoComplete="off" value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} style={{display:"block",width:"100%",padding:9,boxSizing:"border-box"}} placeholder="API key for this provider"/></label>
 {providerDraft==="compatible" && <label style={{display:"block",marginTop:14}}>Full chat/completions URL<input value={endpointDraft} onChange={e=>setEndpointDraft(e.target.value)} style={{display:"block",width:"100%",padding:9,boxSizing:"border-box"}} placeholder="https://example.com/v1/chat/completions"/></label>}
 <p style={{fontSize:12,color:"#666"}}>Credentials are saved locally in this browser profile. Page excerpts are sent to the selected model API. Never distribute a shared key in a public extension.</p>
 <label style={{display:"block",marginTop:14}}>Standing instructions<textarea value={draft} onChange={e=>setDraft(e.target.value)} style={{display:"block",width:"100%",height:85,boxSizing:"border-box"}}/></label>
 <label style={{display:"block",marginTop:14}}>Sites never read (one domain per line)<textarea value={blockedDraft} onChange={e=>setBlockedDraft(e.target.value)} style={{display:"block",width:"100%",height:90,boxSizing:"border-box"}}/></label>
 <label style={{display:"block",marginTop:14}}><input type="checkbox" checked={autoRebuild} onChange={e=>onToggleAutoRebuild(e.target.checked)}/> Auto rebuild</label>
 <label style={{display:"block",marginTop:10}}>Every <select value={intervalHours} disabled={!autoRebuild} onChange={e=>onChangeInterval(Number(e.target.value))}>{REBUILD_INTERVAL_CHOICES.map(h=><option value={h} key={h}>{h} hours</option>)}</select></label>
 {error && <p role="alert" style={{color:"#c22"}}>{error}</p>}
 <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}><button onClick={onClose}>Cancel</button><button style={btn} onClick={()=>void save()}>Save & rebuild</button></div>
 </div></div>;
}
