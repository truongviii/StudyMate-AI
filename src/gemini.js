let currentKey='';
export function setKey(key){currentKey=key.trim();}
export function hasKey(){return Boolean(currentKey);}
export function clearKey(){currentKey='';}
export async function callGemini({system='',prompt,temperature=.3,json=false}){
 if(!currentKey)throw Error('Hãy nhập Gemini API key trong Cài đặt.');
 const model=(await import('./settings.js')).getModel();
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
 const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature,...(json?{responseMimeType:'application/json'}:{})}};
 if(system)body.systemInstruction={parts:[{text:system}]};
 const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':currentKey},body:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error?.message||`Gemini API HTTP ${res.status}`);
 const text=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';if(!text)throw Error('Gemini không trả về nội dung.');return text;
}
export async function embedTexts(texts,{taskType='RETRIEVAL_DOCUMENT'}={}){
 if(!currentKey)throw Error('Hãy nhập Gemini API key.');
 const model=(await import('./settings.js')).getEmbeddingModel();
 const vectors=[];
 for(const text of texts){
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':currentKey},body:JSON.stringify({model:`models/${model}`,content:{parts:[{text}]},taskType})});
  const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error?.message||`Embedding HTTP ${res.status}`);
  if(!Array.isArray(data.embedding?.values))throw Error('Không nhận được embedding.');vectors.push(data.embedding.values);
 }
 return vectors;
}
export function parseJSON(text){try{return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw Error('Gemini trả về JSON không hợp lệ. Hãy thử lại.');}}
