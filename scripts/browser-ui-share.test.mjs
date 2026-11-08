import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('.qa',{recursive:true});
const sampleTitle='合成验收诗 '+crypto.randomUUID().slice(0,8),longTitle='长诗合成测试 '+crypto.randomUUID().slice(0,8);
const base='http://localhost:8080',api=base+'/api',headers={authorization:'Bearer '+'a'.repeat(64)};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Users/Li Yuze/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe':undefined)});
try{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 let hold=null,pending=false,failUpload=false,failSave=false;
 await context.route('https://poetry-gallery-api.tasconyeric.workers.dev/**',async route=>{
  const req=route.request(),query=new URL(req.url()).search,op=new URL(req.url()).searchParams.get('op');
  if(op==='save'&&hold){pending=true;await hold;}
  if((op==='upload'&&failUpload)||(op==='save'&&failSave))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'本地测试：网络暂不可用'})});
  const r=await fetch(api+query,{method:req.method(),headers:{...req.headers(),origin:base},body:req.postData()||undefined});
  await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const field=n=>page.locator('[name='+n+']');
 const waitSaved=()=>page.waitForFunction(()=>document.querySelector('#editor-state').textContent.includes('云端保存成功'));
 await page.goto(base+'/#admin');
 const body='窗前测试一行，\n灯下测试二行。\n\n保留一段空行，\n此为合成诗作。';
 await field('title').fill(sampleTitle);await field('author').fill('测试作者');await field('body').fill(body);await page.reload();assert.equal(await field('body').inputValue(),body);
 await page.locator('#new-poem').click();await field('title').fill('另一本机草稿');await field('body').fill('切换时要保留');
 await page.goto(base+'/#library');await page.getByRole('button',{name:'继续编辑：'+sampleTitle,exact:true}).click();assert.equal(await field('body').inputValue(),body);
 await page.locator('.cloud-access summary').click();await page.locator('#owner-token').fill('a'.repeat(64));await page.locator('#unlock-owner').click();await page.waitForFunction(()=>document.querySelector('#login-form').hidden);
 let release;hold=new Promise(r=>release=r);await page.locator('#save-cloud').click();await page.waitForFunction(()=>document.querySelector('#editor-state').textContent.includes('正在保存'));
 assert.equal(await page.locator('#new-poem').isDisabled(),true);assert.equal(await page.locator('#import-poem').isDisabled(),true);release();hold=null;await waitSaved();
 let records=await (await fetch(api+'?op=owner-list',{headers})).json();const id=records.poems.find(p=>p.title===sampleTitle).id;
 assert.equal((await fetch(api+'?op=detail&id='+id)).status,404);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=64;c.height=64;c.getContext('2d').fillRect(0,0,64,64);return c.toDataURL().split(',')[1];});
 await page.locator('#cover-upload').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 failUpload=true;await page.locator('#upload-cover').click();await page.waitForFunction(()=>document.querySelector('#admin-feedback').textContent.includes('网络暂不可用'));assert.equal(await field('body').inputValue(),body);
 failUpload=false;await page.locator('#upload-cover').click();await page.waitForFunction(()=>document.querySelector('#admin-feedback').textContent==='配图已上传。');await page.locator('#admin-cover-preview').waitFor({state:'visible'});
 records=await (await fetch(api+'?op=owner-list',{headers})).json();const cover=records.poems.find(p=>p.id===id).cover_id;
 assert.equal((await fetch(api+'?op=cover&id='+cover)).status,404);
 await page.goto(base+'/#library');await page.getByRole('button',{name:'继续编辑：另一本机草稿',exact:true}).click();await page.goto(base+'/#library');await page.getByRole('button',{name:'继续编辑：'+sampleTitle,exact:true}).click();await page.locator('#admin-cover-preview').waitFor({state:'visible'});
 await page.locator('button[data-save-status=published]').click();await page.waitForFunction(()=>document.querySelector('#editor-state').textContent.includes('已发布'));
 await page.screenshot({path:'.qa/mvp-mobile-editor.png',fullPage:true});
 const reader=await context.newPage();await reader.goto(base+'/#poem/'+id);await reader.waitForFunction(t=>document.querySelector('#reader-title').textContent===t,sampleTitle);assert.equal(await reader.locator('#reader-poem').innerText(),body);await reader.reload();await reader.locator('#reader-cover').waitFor({state:'visible'});
 assert.equal(await reader.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await reader.locator('#export-poem-image').click();await reader.locator('#share-image-output').waitFor({state:'visible'});
 const size=await reader.locator('#share-image-output').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));assert.equal(size.width,900);assert.ok(size.height>=1250);
 await reader.locator('#card-format').selectOption('square');await reader.locator('#export-poem-image').click();await reader.waitForFunction(()=>document.querySelector('#share-image-output').naturalHeight===900);
 await reader.screenshot({path:'.qa/mvp-mobile-card.png',fullPage:true});
 await reader.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>window.copied=t}});});await reader.locator('#copy-poem-link').click();assert.equal(await reader.evaluate(()=>window.copied),base+'/p/'+id);
 await reader.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await reader.locator('#copy-poem-link').click();assert.equal(await reader.locator('#share-manual-url').inputValue(),base+'/p/'+id);
 await reader.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError');}}));await reader.locator('#share-poem').click();assert.equal(await reader.locator('#reader-feedback').innerText(),'已取消分享。');
 page.once('dialog',d=>d.accept());await page.locator('#withdraw-poem').click();await waitSaved();assert.equal((await fetch(api+'?op=detail&id='+id)).status,404);assert.equal((await fetch(api+'?op=cover&id='+cover)).status,404);
 await reader.reload();await reader.waitForFunction(()=>document.querySelector('#reader-title').textContent==='作品不存在或尚未发布');assert.equal(await reader.locator('#reader-poem').innerText(),'');
 // Failed sync keeps the edit; offline does not claim a cloud save.
 await field('body').fill(body+'\n网络失败时保留');failSave=true;await page.locator('#save-cloud').click();await page.waitForFunction(()=>document.querySelector('#editor-state').textContent.includes('需要重试'));failSave=false;
 await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('#editor-state').textContent.includes('当前离线'));await field('note').fill('离线附记');await context.setOffline(false);
 // Import never replaces the current work, including bad files.
 await page.locator('#import-poem').click();await page.locator('#import-file').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from([255,254,0])});await page.waitForFunction(()=>document.querySelector('#import-feedback').textContent.includes('原作品未改动'));
 assert.ok((await field('body').inputValue()).includes('网络失败时保留'));
 const imported='TXT 测试标题\n\n第一行，\n\n第三行。';await page.locator('#import-file').setInputFiles({name:'test.txt',mimeType:'text/plain',buffer:Buffer.from(imported)});await page.waitForFunction(()=>document.querySelector('#import-feedback').textContent.includes('文件已读取'));await page.locator('#confirm-import').click();assert.equal(await field('body').inputValue(),'第一行，\n\n第三行。');
 await page.locator('#import-poem').click();await page.locator('#import-file').setInputFiles({name:'test.md',mimeType:'text/markdown',buffer:Buffer.from('# Markdown 测试\n\n正文一，\n\n正文二。')});await page.waitForFunction(()=>document.querySelector('#import-feedback').textContent.includes('文件已读取'));await page.locator('#confirm-import').click();assert.equal(await field('title').inputValue(),'Markdown 测试');assert.equal(await field('body').inputValue(),'\n正文一，\n\n正文二。');
 await page.locator('#import-poem').click();await page.locator('#import-text').fill('直接粘贴，\n\n保留空行。');await page.locator('#confirm-import').click();assert.equal(await field('body').inputValue(),'直接粘贴，\n\n保留空行。');
 assert.equal(await page.locator('#make-video').isVisible(),false);assert.equal(await page.locator('#draft-video').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // A long poem renders fully in the reader and explicitly refuses a clipped card.
 await field('title').fill(longTitle);await field('body').fill(Array.from({length:60},(_,i)=>'第'+i+'行合成文字，').join('\n'));await page.locator('button[data-save-status=published]').click();await waitSaved();
 records=await (await fetch(api+'?op=owner-list',{headers})).json();const longId=records.poems.find(p=>p.title===longTitle).id;await reader.goto(base+'/#poem/'+longId);await reader.waitForFunction(t=>document.querySelector('#reader-title').textContent===t,longTitle);await reader.locator('#export-poem-image').click();assert.match(await reader.locator('#reader-feedback').innerText(),/篇幅较长.*链接.*PDF/);assert.equal((await reader.locator('#reader-poem').innerText()).split('\n').length,60);
 assert.ok(!await page.evaluate(()=>JSON.stringify(localStorage).includes('a'.repeat(64))));assert.deepEqual(errors,[]);
 console.log('PASS: 375px authoring/reload/switch/save lock/image failure+private cover/publish/cold link+refresh/PNG vertical+square/clipboard+manual+cancel/withdraw/offline+retry/TXT+MD+paste/long poem; synthetic local data only.');
}finally{await browser.close();}
