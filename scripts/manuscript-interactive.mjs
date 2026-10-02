import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=createInterface({input:stdin,output:stdout});
try{
  console.log('本地手稿 → LaTeX → PDF\n识别与原图复查会调用 DeepSeek API；源稿、校对报告和编译文件保留在本机。');
  const path=(process.argv[2]||await input.question('图片文件或目录路径：')).trim().replace(/^"|"$/g,'');
  const title=(await input.question('讲义标题：')).trim()||'手稿讲义';
  console.log('每页调用两次 API。');
  const confirmed=(await input.question('开始处理？输入 y：')).trim().toLowerCase();
  if(confirmed==='y'){
    const code=await new Promise(resolve=>{const child=spawn(process.execPath,['scripts/manuscript.mjs','run',path,'--title',title],{cwd:root,stdio:'inherit'});child.on('error',()=>resolve(1));child.on('close',resolve);});
    process.exitCode=code||0;
  }
  await input.question('按 Enter 关闭…');
}finally{input.close();}
