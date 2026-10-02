import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hash } from '../ingest/core.mjs';

export const escapeTex = text => String(text).replace(/[\\{}$&#_%~^]/g, char => ({ '\\':'\\textbackslash{}', '{':'\\{', '}':'\\}', '$':'\\$', '&':'\\&', '#':'\\#', '_':'\\_', '%':'\\%', '~':'\\textasciitilde{}', '^':'\\textasciicircum{}' }[char]));
export function documentTex(title, body) {
  return `\\documentclass[UTF8,fontset=fandol,11pt,a4paper]{ctexart}\n\\usepackage[margin=25mm]{geometry}\n\\usepackage{amsmath,amssymb,amsthm}\n\\usepackage{xcolor}\n\\usepackage[hidelinks]{hyperref}\n\\newcommand{\\unclear}[1]{\\textcolor{red}{[待确认：#1]}}\n\\title{${escapeTex(title)}}\n\\author{宋明卓 / Mingzhuo Song}\n\\date{}\n\\begin{document}\n\\maketitle\n${body}\n\\end{document}\n`;
}
export function lintTex(source, bodyOnly=false) {
  const errors=[],warnings=[];
  const text=source.replace(/(?<!\\)%[^\n]*/g,'');
  if (!text.trim()) errors.push('LaTeX 源稿为空。');
  // Model output is a document body, with no file I/O or dynamic command creation.
  const commands=bodyOnly?text:text.replace(/^\\(?:documentclass|usepackage)[^\n]*$/gm,'').replace(/^\\newcommand\{\\unclear\}[^\n]*$/gm,'');
  if (/\\(?:input|include|includegraphics|openin|openout|read|write|immediate|catcode|csname|def|edef|gdef|xdef|let|newread|newwrite|directlua|special|usepackage|documentclass|newcommand|renewcommand)(?![A-Za-z])/.test(commands)) errors.push('源稿含文件访问或动态命令，请移除后编译。');
  let braces=0;
  for(const ch of text.replace(/\\[{}]/g,'')){if(ch==='{')braces++;if(ch==='}')braces--;if(braces<0){errors.push('花括号闭合顺序错误。');break;}}
  if(braces!==0)errors.push('花括号数量不匹配。');
  const stack=[];
  for(const m of text.matchAll(/\\(begin|end)\{([^}]+)\}/g)){if(m[1]==='begin')stack.push(m[2]);else if(stack.pop()!==m[2])errors.push(`环境不匹配：${m[2]}`);}
  if(stack.length)errors.push(`环境未闭合：${stack.join(', ')}`);
  const labels=[...text.matchAll(/\\label\{([^}]+)\}/g)].map(m=>m[1]);
  if(new Set(labels).size!==labels.length)errors.push('存在重复标签。');
  for(const m of text.matchAll(/\\(?:eqref|ref)\{([^}]+)\}/g))if(!labels.includes(m[1]))warnings.push(`引用未定义：${m[1]}`);
  if(/\\unclear\{|UNCLEAR|无法辨认/.test(text.replace(/^\\newcommand[^\n]*$/gm,'')))warnings.push('存在待确认标记，请对照原图检查。');
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
function run(command,args,cwd){return new Promise(resolve=>{
  let log='',done=false;const child=spawn(command,args,{cwd,windowsHide:true,env:{...process.env,openin_any:'p',openout_any:'p'}});
  const finish=result=>{if(!done){done=true;clearTimeout(timer);resolve(result);}};
  const timer=setTimeout(()=>{child.kill();finish({success:false,log:'XeLaTeX 编译超时。'});},120000);
  child.stdout.on('data',b=>{log=(log+b).slice(-20000);});child.stderr.on('data',b=>{log=(log+b).slice(-20000);});
  child.on('error',e=>finish({success:false,log:`无法启动 ${command}：${e.code || e.message}`}));child.on('close',code=>finish({success:code===0,log}));
});}
export async function compileTex(folder, engine=process.env.XELATEX_PATH || 'xelatex') {
  const source=await readFile(join(folder,'main.tex'),'utf8'),lint=lintTex(source);
  await writeFile(join(folder,'lint.json'),JSON.stringify(lint,null,2));
  if(lint.errors.length)throw new Error(lint.errors.join('\n'));
  let log='';
  for(let pass=1;pass<=2;pass++){
    const result=await run(engine,['-no-shell-escape','-interaction=nonstopmode','-halt-on-error','-file-line-error','main.tex'],folder);
    log+=`\n=== Pass ${pass} ===\n${result.log}`;
    await writeFile(join(folder,'compile.log'),log);
    if(!result.success)throw new Error('XeLaTeX 编译失败，请查看 compile.log 并修改 main.tex。');
  }
  const pdf=await readFile(join(folder,'main.pdf'));
  if(pdf.subarray(0,5).toString()!=='%PDF-')throw new Error('未生成有效 PDF。');
  const compilation={sourceHash:hash(source),pdfHash:hash(pdf),compiledAt:new Date().toISOString(),warnings:lint.warnings};
  await writeFile(join(folder,'compilation.json'),JSON.stringify(compilation,null,2));
  return compilation;
}
export async function exportPdf(folder,destination,entry) {
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(entry.slug))throw new Error('PDF 名称只能使用小写字母、数字和连字符。');
  const source=await readFile(join(folder,'main.tex'),'utf8'),pdf=await readFile(join(folder,'main.pdf'));
  const compilation=JSON.parse(await readFile(join(folder,'compilation.json'),'utf8'));
  if(compilation.sourceHash!==hash(source)||compilation.pdfHash!==hash(pdf))throw new Error('源稿或 PDF 已改变，请重新编译后发布。');
  await mkdir(destination,{recursive:true});
  const catalogPath=join(destination,'catalog.json');let catalog=[];
  try{catalog=JSON.parse(await readFile(catalogPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  await copyFile(join(folder,'main.pdf'),join(destination,`${entry.slug}.pdf`));
  const item={slug:entry.slug,title:entry.title,titleEn:entry.titleEn||entry.title,topic:entry.topic||'notes',file:`${entry.slug}.pdf`,updatedAt:new Date().toISOString().slice(0,10)};
  catalog=catalog.filter(x=>x.slug!==entry.slug);catalog.push(item);
  await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
  return item;
}
