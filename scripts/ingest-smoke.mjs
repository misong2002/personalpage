// Runs a paid API smoke test using only a synthetic, locally generated image.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8765';
const status=await (await fetch(base+'/api/status')).json();
assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
assert.equal((await fetch(base+'/api/status',{headers:{Origin:'https://example.com'}})).status,403);
assert.equal((await fetch(base+'/.env')).status,404);
async function post(path,data){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Ingest-Token':status.token},body:JSON.stringify(data)});const body=await response.json();if(!response.ok)throw new Error(body.error);return body;}
const existing=process.argv[2];
const job=existing ? await(await fetch(base+`/api/jobs/${existing}`)).json() : await post('/api/jobs',{title:'接口测试 · 合成印刷文字',images:[{name:'synthetic-test.png',base64:readFileSync('artifacts/ingest-test.png').toString('base64')}]});
console.log('Local import and request guards passed.');
if(existing) await post(`/api/jobs/${job.id}/save`,{markdown:job.markdown});
else await post(`/api/jobs/${job.id}/process`,{});
const deadline=Date.now()+240000;
let result;
while(Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,1500));result=await(await fetch(base+`/api/jobs/${job.id}`)).json();if(['review','failed'].includes(result.status))break;}
console.log(JSON.stringify({jobId:job.id,status:result.status,error:result.error,markdown:result.markdown,reviewCurrent:result.reviewCurrent,findings:result.review?.findings,lint:result.lint,compilation:result.compilation},null,2));
assert.equal(result.status,'review');assert.ok(result.markdown.includes('123'));assert.equal(result.reviewCurrent,true);assert.equal(result.compilation.success,true);
const preview=await fetch(base+`/api/jobs/${job.id}/preview/draft.html`);assert.equal(preview.status,200);
assert.ok(preview.headers.get('content-security-policy').includes('sandbox'));
const approved=await post(`/api/jobs/${job.id}/approve`,{confirmed:true});assert.equal(approved.status,'approved');
assert.equal((await fetch(base+`/api/jobs/${job.id}/file/approved.md`)).status,200);
const privateHtml=await fetch('http://127.0.0.1:4173/ingest-private/'+job.id+'/draft.html');assert.equal(privateHtml.status,404);
console.log('Preview, explicit approval, download, and public-site isolation passed.');
