const defaults={model:'gemini-3.8-flash',embeddingModel:'gemini-embedding-001'};
const retiredModels=new Set(['gemini-2.5-flash','models/gemini-2.5-flash']);
let config={...defaults};
export function loadSettings(data={}){
 const next={...defaults,...data};
 if(retiredModels.has(next.model))next.model=defaults.model;
 config=next;
}
export const getModel=()=>config.model;
export const getEmbeddingModel=()=>config.embeddingModel;
export const getSettings=()=>({...config});
