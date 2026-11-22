import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {db,uid} from './db.js';
import {embedTexts} from './gemini.js';
import {getEmbeddingModel} from './settings.js';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
export function splitText(text,maxChars=1500,overlap=220){const chunks=[];let start=0;while(start<text.length){let end=Math.min(start+maxChars,text.length);if(end<text.length){const cut=text.lastIndexOf(' ',end);if(cut>start+maxChars*.65)end=cut;}const piece=text.slice(start,end).trim();if(piece)chunks.push(piece);if(end>=text.length)break;start=Math.max(start+1,end-overlap);}return chunks;}
export async function addDocument(file,subjectId,onProgress=()=>{}){
 if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf')throw Error('Hiện chỉ hỗ trợ PDF.');
 if(file.size>15*1024*1024)throw Error('Giới hạn PDF là 15 MB.');
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 const id=uid(),pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();const text=content.items.map(x=>x.str||'').join(' ');if(text.trim())pages.push({page:i,text});onProgress(`Đọc PDF: ${i}/${pdf.numPages} trang`);}
 if(!pages.length)throw Error('Không trích xuất được văn bản. PDF scan cần OCR (chưa hỗ trợ).');
 const parts=pages.flatMap(p=>splitText(p.text).map(text=>({text,page:p.page})));
 if(parts.length>350)throw Error('PDF tạo quá 350 đoạn. Hãy dùng tài liệu ngắn hơn để tránh vượt quota.');
 await db.documents.put({id,subjectId,name:file.name,pages:pdf.numPages,chunkCount:parts.length,status:'indexing',createdAt:Date.now()});
 try{for(let i=0;i<parts.length;i++){
   onProgress(`Tạo embedding: ${i+1}/${parts.length}`);
   const [embedding]=await embedTexts([parts[i].text]);
   await db.chunks.put({id:uid(),subjectId,documentId:id,page:parts[i].page,text:parts[i].text,embedding,embeddingModel:getEmbeddingModel()});
  }
  await db.documents.update(id,{status:'ready'});
 }catch(err){await db.documents.update(id,{status:'error'});throw err;}
 return id;
}
function cosine(a,b){if(!a||!b||a.length!==b.length)return -1;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return dot/(Math.sqrt(aa)*Math.sqrt(bb)||1);}
export async function searchDocuments(subjectId,query,topK=5){const chunks=await db.chunks.where('subjectId').equals(subjectId).toArray();const compatible=chunks.filter(c=>c.embeddingModel===getEmbeddingModel());if(!compatible.length)return [];
 const [vector]=await embedTexts([query],{taskType:'RETRIEVAL_QUERY'});
 const results=compatible.map(c=>({...c,score:cosine(vector,c.embedding)})).sort((a,b)=>b.score-a.score).slice(0,topK);
 const docs=await db.documents.where('subjectId').equals(subjectId).toArray();const names=Object.fromEntries(docs.map(d=>[d.id,d.name]));return results.map(({embedding,...c})=>({...c,documentName:names[c.documentId]||'Tài liệu'}));}
