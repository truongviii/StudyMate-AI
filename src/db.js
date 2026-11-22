import Dexie from 'dexie';
export const db=new Dexie('studymate-v1');
db.version(1).stores({subjects:'id,createdAt',documents:'id,subjectId,createdAt',chunks:'id,subjectId,documentId',conversations:'id,subjectId,createdAt',messages:'id,conversationId,createdAt',quizzes:'id,subjectId,createdAt',profiles:'subjectId',settings:'key'});
export const uid=()=>crypto.randomUUID();
export async function getProfile(subjectId){return (await db.profiles.get(subjectId))||{subjectId,topics:{},style:'step-by-step'};}
export async function exportBackup(){const out={format:'studymate-backup',version:1,exportedAt:new Date().toISOString(),data:{}};for(const name of ['subjects','documents','chunks','conversations','messages','quizzes','profiles'])out.data[name]=await db[name].toArray();return out;}
export async function importBackup(payload){if(payload?.format!=='studymate-backup'||payload.version!==1||!payload.data)throw Error('File sao lưu không hợp lệ');const names=['subjects','documents','chunks','conversations','messages','quizzes','profiles'];for(const n of names)if(!Array.isArray(payload.data[n]))throw Error('Thiếu dữ liệu '+n);await db.transaction('rw',...names.map(n=>db[n]),async()=>{for(const n of names){await db[n].clear();if(payload.data[n].length)await db[n].bulkPut(payload.data[n]);}});}
