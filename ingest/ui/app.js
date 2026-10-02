const $ = id => document.getElementById(id);
let token = '', active = null, dirty = false, polling = false;
let selectedFiles = [];
const busy = job => ['processing', 'verifying', 'compiling'].includes(job.status);
async function api(path, data) {
  const response = await fetch(path, data === undefined ? {} : { method:'POST', headers:{'Content-Type':'application/json','X-Ingest-Token':token}, body:JSON.stringify(data) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || '请求失败'); return value;
}
function message(error) { $('message').textContent = error?.message || ''; }
function text(parent, content, className = '') { const el = document.createElement('p'); el.textContent = content; el.className = className; parent.append(el); }
function downloads(job) {
  const parent = $('downloads'); parent.replaceChildren();
  const names = ['raw-transcript.md','draft.md','draft.qmd','review.json','lint.json'];
  if (job.status === 'approved') names.push('approved.md','approved.qmd');
  for (const name of names) { if (!job.markdown) continue; const a = document.createElement('a'); a.className='download'; a.textContent=name; a.href=`/api/jobs/${job.id}/file/${name}`; parent.append(a); }
}
function showImage(job) {
  const image = job.images[Number($('page').value) || 0]; if (!image) return;
  $('original').src=`/api/jobs/${job.id}/file/${image.file}`;
  $('source-name').textContent=`${image.name} · SHA-256 ${image.sha256.slice(0,12)}…`;
}
function render(job, initial = false) {
  active = job; $('empty').hidden=true; $('review').hidden=false; $('job-title').textContent=job.title;
  $('progress').textContent=job.progress; $('job-error').textContent=job.error || '';
  if (initial) {
    dirty=false; $('confirmed').checked=false; $('markdown').value=job.markdown || '';
    $('page').replaceChildren(); job.images.forEach((image,i) => { const opt=document.createElement('option'); opt.value=i; opt.textContent=`第 ${i+1} 页 · ${image.name}`; $('page').append(opt); }); showImage(job);
  } else if (!dirty) $('markdown').value=job.markdown || '';
  $('process').disabled=busy(job); $('process').textContent=job.markdown?'重新转录（覆盖草稿，API）':'开始识别与校对';
  $('save').disabled=busy(job) || !job.markdown; $('verify').disabled=busy(job) || !job.markdown || dirty;
  $('approve').disabled=busy(job) || dirty || !job.reviewCurrent || !job.compilation?.success || !!job.lint?.errors.length || !$('confirmed').checked;
  $('review-current').textContent=job.review ? (job.reviewCurrent ? '校对报告对应当前已保存草稿。' : '草稿已修改，旧校对报告仅供参考。请重新校对。') : '等待识别与校对。';
  const report=$('findings'); report.replaceChildren();
  if(job.review) text(report,job.review.note,'small');
  for (const item of job.uncertainties || []) text(report, `第 ${item.page} 页 · ${item.location || ''}\n转录疑点：${item.description || ''}`, 'finding warning');
  for (const item of job.review?.findings || []) text(report, `第 ${item.page} 页 · ${item.location || ''}\n模型读取的原图（可能误判）：${item.original || ''}\n草稿：${item.transcript || ''}\n建议：${item.suggestion || ''}`, 'finding');
  if (job.review && !job.review.findings.length) text(report,'模型未报告差异；仍需人工核对。');
  const lint=$('lint'); lint.replaceChildren();
  for (const item of job.lint?.errors || []) text(lint,item,'error');
  for (const item of job.lint?.warnings || []) text(lint,item,'warning');
  if(job.lint) text(lint,job.lint.note);
  $('compile').textContent=job.compilation ? `${job.compilation.success?'编译通过':'编译未通过'}\n${job.compilation.log}` : '尚未编译';
  $('preview-wrap').hidden=!job.compilation?.success;
  downloads(job);
}
async function list() {
  const jobs=await api('/api/jobs'); const parent=$('jobs'); parent.replaceChildren();
  if(!jobs.length) text(parent,'暂无任务');
  for(const job of jobs) { const b=document.createElement('button'); b.className=`job${active?.id===job.id?' selected':''}`; b.textContent=`${job.title}\n${job.progress}`;
    b.onclick=async()=>{ if(dirty && !confirm('未保存的修改将丢失。切换任务？'))return; try {render(await api(`/api/jobs/${job.id}`),true); await list();}catch(e){message(e);} }; parent.append(b); }
}
async function perform(action,data={}) {
  message(null);
  try { const result=await api(`/api/jobs/${active.id}/${action}`,data); render(result,true); await list(); }
  catch(error){message(error);}
}
$('images').onchange=()=>{
  selectedFiles=[...$('images').files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  $('selected').textContent=selectedFiles.map((f,i)=>`${i+1}. ${f.name}`).join(' · ') || '尚未选择图片';
};
$('import').onclick=async()=>{
  message(null); $('import').disabled=true;
  try {
    if(!selectedFiles.length || selectedFiles.length>6) throw new Error('请选择 1–6 张图片。');
    if(selectedFiles.some(f=>f.size>8*1024*1024) || selectedFiles.reduce((sum,f)=>sum+f.size,0)>24*1024*1024)throw new Error('每张最多 8 MB，每批总计最多 24 MB。');
    const images=[];
    for(const file of selectedFiles){ const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});images.push({name:file.name,base64}); }
    render(await api('/api/jobs',{title:$('title').value,images}),true); await list();
  }catch(error){message(error);}finally{$('import').disabled=false;}
};
$('page').onchange=()=>showImage(active);
$('markdown').oninput=()=>{dirty=true;$('approve').disabled=true;$('verify').disabled=true;$('confirmed').checked=false;};
$('confirmed').onchange=()=>{if(active)render(active);};
$('process').onclick=()=>{if(confirm('将把此任务的原图发送给 DeepSeek，并产生 API 费用。重新转录会覆盖当前草稿。继续？'))perform('process');};
$('save').onclick=()=>perform('save',{markdown:$('markdown').value});
$('verify').onclick=()=>{if(confirm('将再次把原图和当前草稿发送给 DeepSeek 校对，并产生 API 费用。继续？'))perform('verify');};
$('approve').onclick=()=>perform('approve',{confirmed:$('confirmed').checked});
$('preview-wrap').ontoggle=()=>{if($('preview-wrap').open && active?.compilation?.success)$('preview').src=`/api/jobs/${active.id}/preview/draft.html?v=${encodeURIComponent(active.updatedAt)}`;};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function init(){try{const status=await api('/api/status');token=status.token;$('connection').textContent=status.configured?`DeepSeek 已配置 · ${status.model} · 服务仅监听本机`:'未配置 API 密钥：请设置项目 .env 后刷新';await list();}catch(e){message(e);}}
init();
setInterval(async()=>{if(!active || !busy(active) || polling)return;polling=true;try{render(await api(`/api/jobs/${active.id}`));await list();}catch(e){message(e);}finally{polling=false;}},1800);
