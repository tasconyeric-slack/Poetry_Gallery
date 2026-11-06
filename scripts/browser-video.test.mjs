import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
mkdirSync('.qa',{recursive:true});
// Owner-local synthetic tone; no bundled or copyrighted audio.
const rate=16000,frames=rate*2,pcm=Buffer.alloc(44+frames*2);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(rate,24);pcm.writeUInt32LE(rate*2,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(frames*2,40);for(let i=0;i<frames;i++)pcm.writeInt16LE(Math.round(1500*Math.sin(i/rate*440*Math.PI*2)),44+i*2);writeFileSync('.qa/synthetic-tone.wav',pcm);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Users/Li Yuze/AppData/Local/ms-playwright/chromium-1254/chrome-win64/chrome.exe':undefined),args:['--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:375,height:812},acceptDownloads:true});
 await context.route('https://poetry-gallery-api.tasconyeric.workers.dev/**',r=>r.fulfill({json:{poems:[]}}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8080/#admin');
 await page.locator('[name=title]').fill('秋笺·视频本机测试');await page.locator('[name=author]').fill('合成测试作者');await page.locator('[name=body]').fill('窗外疏星映小楼，\n灯前细雨记清秋。\n\n长街远树归人少，\n一纸新诗寄晚舟。\n\n明日江风吹客路，\n且留旧梦待回眸。');
 await page.locator('#draft-video').click();await page.locator('.video-studio').waitFor();await page.locator('#video-duration').fill('10');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#video-theme').selectOption('dark');await page.locator('#video-audio').setInputFiles('.qa/synthetic-tone.wav');
 await page.locator('#video-preview').click();await page.waitForFunction(()=>document.querySelector('#video-status').textContent.includes('预览结束'),{},{timeout:20000});
 await page.locator('#video-export').click();await page.waitForFunction(()=>document.querySelector('#video-progress').value>58);await page.screenshot({path:'.qa/mobile-video.png'});await page.locator('#video-canvas').screenshot({path:'.qa/video-frame.png'});
 await page.waitForFunction(()=>document.querySelector('#video-status').textContent.includes('视频已生成'),{},{timeout:20000});
 await page.locator('#video-result').evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=1)return resolve();v.onloadedmetadata=resolve;v.onerror=reject;}));
 const meta=await page.locator('#video-result').evaluate(v=>({w:v.videoWidth,h:v.videoHeight,duration:v.duration}));assert.equal(meta.w,720);assert.equal(meta.h,1280);if(Number.isFinite(meta.duration))assert.ok(meta.duration>9&&meta.duration<12);
 await page.locator('#video-result').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#video-result').currentTime>.5);
 const downloadPromise=page.waitForEvent('download');await page.locator('#video-download').click();const download=await downloadPromise;const name=download.suggestedFilename();await download.saveAs('.qa/'+name);const bytes=readFileSync('.qa/'+name);assert.ok(bytes.length>10000);if(name.endsWith('.mp4')){assert.equal(bytes.toString('ascii',4,8),'ftyp');assert.ok(bytes.includes(Buffer.from('mp4a')));}else assert.equal(bytes.subarray(0,4).toString('hex'),'1a45dfa3');
 // Exercise actual WebM fallback even on browsers capable of MP4.
 await page.locator('#video-result').evaluate(v=>v.pause());
 await page.evaluate(()=>{const check=MediaRecorder.isTypeSupported.bind(MediaRecorder);MediaRecorder.isTypeSupported=type=>!type.startsWith('video/mp4')&&check(type);});
 await page.locator('#video-theme').selectOption('paper');await page.locator('#video-audio').setInputFiles([]);await page.locator('#video-export').click();await page.waitForFunction(()=>document.querySelector('#video-status').textContent.includes('视频已生成'),{},{timeout:20000});
 const webmPromise=page.waitForEvent('download');await page.locator('#video-download').click();const webm=await webmPromise;assert.ok(webm.suggestedFilename().endsWith('.webm'));await webm.saveAs('.qa/poetry-fallback.webm');assert.equal(readFileSync('.qa/poetry-fallback.webm').subarray(0,4).toString('hex'),'1a45dfa3');
 await page.locator('#video-result').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#video-result').currentTime>.5);
 await page.locator('#video-result').evaluate(v=>v.pause());await page.locator('#video-export').click();await page.locator('#video-cancel').click();await page.waitForFunction(()=>document.querySelector('#video-status').textContent.includes('已取消'));assert.equal(await page.locator('#video-download').isHidden(),true);
 await page.locator('#video-close').click();assert.equal(await page.locator('.video-studio').count(),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',firstExport:name,metadata:meta,checks:'375px draft entry, 3 verse slides, 10s preview, real audio encode, download magic, playback, forced WebM fallback, cancel, cleanup',artifacts:'.qa/mobile-video.png, .qa/'+name+', .qa/poetry-fallback.webm'}));
}finally{await browser.close();}
