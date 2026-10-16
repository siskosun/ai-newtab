import type { HomepageLanguage } from "@homepage/agent-core";
import { t } from "@/lib/i18n";
import { SandpackLayout, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";

const INDEX_JS = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);`;

/** The generated TSX runs only in Sandpack's isolated iframe. */
export function HomepagePreview({code,locale}: {code:string;locale:HomepageLanguage}) {
  const html = '<!DOCTYPE html><html lang="' + locale +
    '"><head><meta charset="UTF-8"><title>' + t(locale, "homepageTitle") +
    '</title></head><body><div id="root"></div></body></html>';
  const files = {
    "/App.js": { code },
    "/index.js": { code: INDEX_JS },
    "/index.html": { code: html },
  };
  return (
    <SandpackProvider files={files} template="react" options={{autorun:true}}>
      <SandpackLayout style={{height:"100vh",width:"100vw"}}>
        <SandpackPreview style={{height:"100%"}} />
      </SandpackLayout>
    </SandpackProvider>
  );
}
