import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const escape = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function generateCatalog(root) {
  const catalog=JSON.parse(readFileSync(join(root,'pdfs/catalog.json'),'utf8'));
  if(!Array.isArray(catalog))throw new Error('PDF 目录应为数组。');
  const seen=new Set();
  for(const item of catalog){
    if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(item.slug)||item.file!==`${item.slug}.pdf`||seen.has(item.slug))throw new Error('PDF 目录存在重复或无效路径。');
    seen.add(item.slug);
    if(!existsSync(join(root,'pdfs',item.file)))throw new Error(`PDF 文件不存在：${item.file}`);
  }
  const copy={zh:{empty:'尚未发布 PDF 讲义。完成本地编译与校对后，讲义将在这里提供。',view:'打开 PDF',download:'下载',title:item=>item.title,prefix:'pdfs/'},en:{empty:'No PDFs have been published yet. Reviewed lecture notes will appear here.',view:'Open PDF',download:'Download',title:item=>item.titleEn||item.title,prefix:'../pdfs/'},ja:{empty:'PDF 講義はまだ公開されていません。',view:'PDF を開く',download:'ダウンロード',title:item=>item.titleEn||item.title,prefix:'../pdfs/'}};
  for(const [lang,t] of Object.entries(copy)){
    const body=catalog.length?`<div class="note-grid">${catalog.map(item=>`<article class="note-card"><p class="tag">PDF · ${escape(item.updatedAt||'')}</p><h3>${escape(t.title(item))}</h3><p><a href="${t.prefix}${item.file}">${t.view} →</a> &nbsp; <a href="${t.prefix}${item.file}" download>${t.download}</a></p></article>`).join('')}</div>`:`<p class="site-note">${t.empty}</p>`;
    writeFileSync(join(root,`_includes/pdf-list-${lang}.qmd`),'```{=html}\n'+body+'\n```\n');
  }
}
