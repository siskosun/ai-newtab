/** Browser-side adapters for model text generation. No backend or agent-specific runtime. */
export const PROVIDERS = [
  {id:"openai",label:"OpenAI",model:"gpt-4.1-mini"},
  {id:"gemini",label:"Google Gemini",model:"gemini-2.5-flash"},
  {id:"anthropic",label:"Anthropic Claude",model:"claude-sonnet-4-5"},
  {id:"deepseek",label:"DeepSeek",model:"deepseek-chat"},
  {id:"qwen",label:"Qwen",model:"qwen-plus"},
  {id:"compatible",label:"OpenAI compatible / local",model:""},
] as const;
export type ProviderId = typeof PROVIDERS[number]["id"];
export interface ProviderSettings { provider:ProviderId; model:string; apiKey:string; endpoint?:string }
export const DEFAULT_PROVIDER: ProviderId = "openai";
export const DEFAULT_PROVIDER_MODEL = "gpt-4.1-mini";
export function providerPreset(p:ProviderId){ return PROVIDERS.find(x=>x.id===p) ?? PROVIDERS[0]; }
export function isProviderId(x:unknown):x is ProviderId {return PROVIDERS.some(p=>p.id===x)}
const URLS:Record<Exclude<ProviderId,"compatible"|"gemini">,string> = {
 openai:"https://api.openai.com/v1/chat/completions",
 anthropic:"https://api.anthropic.com/v1/messages",
 deepseek:"https://api.deepseek.com/chat/completions",
 qwen:"https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
};
export function providerEndpoint(s:ProviderSettings):URL {
 if (!s.model.trim() || s.model.length > 180 || /[\r\n]/.test(s.model)) throw Error("Enter a valid model ID.");
 let raw = s.provider==="compatible" ? s.endpoint?.trim() : s.provider==="gemini"
  ? "https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(s.model)+":generateContent" : URLS[s.provider];
 if(!raw) throw Error("Enter an API endpoint in Settings.");
 let url:URL;
 try {url = new URL(raw)}catch{throw Error("Invalid API endpoint URL.")}
 const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
 if(url.protocol!=="https:" && !(s.provider==="compatible" && local && url.protocol==="http:"))
   throw Error("HTTPS is required except for a local endpoint.");
 if(url.username || url.password || url.hash || url.search) throw Error("API endpoint must not contain credentials or query parameters.");
 if(s.provider==="compatible" && !url.pathname.endsWith("/chat/completions")) throw Error("Endpoint must end in /chat/completions.");
 if(!s.apiKey.trim() && !(s.provider==="compatible" && local)) throw Error("Set an API key for the selected provider.");
 return url;
}
export async function generateText(s:ProviderSettings,system:string,prompt:string,signal?:AbortSignal):Promise<string>{
 const url=providerEndpoint(s);
 const headers:Record<string,string>={"content-type":"application/json"};
 let body:unknown;
 if(s.provider==="gemini"){
  headers["x-goog-api-key"]=s.apiKey;
  body={systemInstruction:{parts:[{text:system}]},contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:8192}};
 }else if(s.provider==="anthropic"){
  headers["x-api-key"]=s.apiKey;
  headers["anthropic-version"]="2023-06-01";
  headers["anthropic-dangerous-direct-browser-access"]="true";
  body={model:s.model,max_tokens:8192,system,messages:[{role:"user",content:prompt}]};
 }else{
  if(s.apiKey) headers.authorization="Bearer "+s.apiKey;
  body={model:s.model,messages:[{role:"system",content:system},{role:"user",content:prompt}],
    ...(s.provider==="openai"?{max_completion_tokens:8192}:{max_tokens:8192})};
 }
 let response:Response;
 try {response=await fetch(url.toString(),{method:"POST",headers,body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)})}
 catch(e){throw Error("Model request failed: "+String(e)+". Check provider access and browser CORS support.")}
 if(!response.ok){
  const raw=(await response.text().catch(()=>"")).slice(0,500);
  throw Error("Model API HTTP "+response.status+": "+raw);
 }
 const data:any=await response.json();
 let answer="";
 if(s.provider==="gemini") answer=data.candidates?.[0]?.content?.parts?.map((p:any)=>p.text??"").join("")??"";
 else if(s.provider==="anthropic") answer=data.content?.filter((p:any)=>p.type==="text").map((p:any)=>p.text??"").join("\n")??"";
 else {const content=data.choices?.[0]?.message?.content;answer=typeof content==="string"?content:Array.isArray(content)?content.map((p:any)=>p.text??"").join("\n"):"";}
 if(!answer.trim()) throw Error("The model returned no text. Check the model ID, token quota and provider.");
 return answer.trim();
}
