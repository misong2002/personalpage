import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,writeFile,readFile,readdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { documentTex,lintTex,exportPdf } from './latex.mjs';
import { hash } from '../ingest/core.mjs';
test('Chinese document wrapper and escaped title are valid',()=>{
  const source=documentTex('50% & $x$', '\\section{示例}\n\\begin{equation}x=1\\label{eq:x}\\end{equation}\n见 \\eqref{eq:x}。');
  assert.ok(source.includes('50\\% \\& \\$x\\$'));
  assert.deepEqual(lintTex(source).errors,[]);
});
test('model body cannot define commands or access local files',()=>{
  for(const source of ['\\input{../.env}','\\newcommand{\\foo}{x}','\\usepackage{shellesc}','\\write18{echo test}'])assert.ok(lintTex(source,true).errors.length);
});
test('equation labels and environments receive mechanical checks',()=>{
  assert.ok(lintTex('\\begin{align}x\\end{equation}',true).errors.length);
  assert.ok(lintTex('\\label{x}\\label{x}',true).errors.length);
  assert.ok(lintTex('\\eqref{missing}',true).warnings.length);
});
test('publish exports only a current PDF and catalog, rejecting stale source',async()=>{
  const privateRoot=resolve('manuscript-private');await mkdir(privateRoot,{recursive:true});
  const base=await mkdtemp(join(privateRoot,'qa-')),job=join(base,'job'),out=join(base,'published');await mkdir(job);
  const source=documentTex('Test','Test'),pdf=Buffer.from('%PDF-1.4\nunit-test-placeholder');
  await writeFile(join(job,'main.tex'),source);await writeFile(join(job,'main.pdf'),pdf);await writeFile(join(job,'original.png'),'private');
  await writeFile(join(job,'compilation.json'),JSON.stringify({sourceHash:hash(source),pdfHash:hash(pdf)}));
  await exportPdf(job,out,{slug:'test-notes',title:'测试',titleEn:'Test'});
  assert.deepEqual((await readdir(out)).sort(),['catalog.json','test-notes.pdf']);
  assert.equal(JSON.parse(await readFile(join(out,'catalog.json'),'utf8'))[0].titleEn,'Test');
  await writeFile(join(job,'main.tex'),source+'changed');
  await assert.rejects(()=>exportPdf(job,out,{slug:'test-notes',title:'Test'}),/重新编译/);
  await assert.rejects(()=>exportPdf(job,out,{slug:'../escape',title:'Test'}),/名称/);
});
