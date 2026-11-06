// Lazy-loaded local video studio. No media or poem content leaves this browser.
export function buildTimeline(poem,duration){
 const raw=(poem.lines||String(poem.body||'').split('\n')).flatMap(line=>{
  const chars=Array.from(line);if(!chars.length)return [''];
  return Array.from({length:Math.ceil(chars.length/16)},(_,i)=>chars.slice(i*16,i*16+16).join(''));
 });
 const slides=[];let group=[];
 for(const line of raw){if(!line){if(group.length)slides.push(group);group=[];continue;}group.push(line);if(group.length===2){slides.push(group);group=[];}}
 if(group.length)slides.push(group);
 if(!slides.length)throw Error('请先写下诗句。');
 if(slides.length>24)throw Error('诗篇较长，请在本机另建一首节选（最多 48 行短句）后制作视频，原文不会截断。');
 const weights=slides.map(lines=>Math.max(10,lines.join('').length)),total=weights.reduce((a,b)=>a+b,0);
 let time=1.5;return [{start:0,end:1.5,kind:'intro',lines:[]},...slides.map((lines,i)=>{const start=time;time+=(duration-3)*weights[i]/total;return {start,end:time,kind:'verse',lines};}),{start:duration-1.5,end:duration,kind:'outro',lines:[]}];
}
const chunks=(text,n)=>Array.from({length:Math.ceil(Array.from(text).length/n)},(_,i)=>Array.from(text).slice(i*n,i*n+n).join(''));
export function drawFrame(canvas,poem,timeline,time,theme='paper',photo=null){
 const ctx=canvas.getContext('2d'),dark=theme==='dark';
 ctx.fillStyle=dark?'#142b30':'#f4efdf';ctx.fillRect(0,0,720,1280);
 if(photo){const scale=Math.max(720/photo.width,1280/photo.height);ctx.drawImage(photo,(720-photo.width*scale)/2,(1280-photo.height*scale)/2,photo.width*scale,photo.height*scale);ctx.fillStyle=dark?'#10272bdd':'#f4efdfdd';ctx.fillRect(0,0,720,1280);}
 ctx.strokeStyle=dark?'#748e89':'#cbbba1';ctx.lineWidth=2;ctx.strokeRect(32,32,656,1216);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=dark?'#b9c7bd':'#85634c';ctx.font='24px serif';ctx.fillText('诗 词 馆',360,108);
 const slide=timeline.find(x=>time>=x.start&&time<x.end)||timeline[timeline.length-1];
 const progress=(time-slide.start)/(slide.end-slide.start);ctx.globalAlpha=Math.min(1,Math.max(0,progress*5),Math.max(0,(1-progress)*6));
 ctx.fillStyle=dark?'#f4efdf':'#263b33';
 const title=chunks(poem.title||'未题',16),author=chunks(poem.author||'作者未署名',20);
 if(slide.kind==='verse'){
  ctx.font='26px "Songti SC","Noto Serif CJK SC",serif';title.forEach((l,i)=>ctx.fillText(l,360,210+i*30,600));
  ctx.font='42px "Songti SC","Noto Serif CJK SC",serif';slide.lines.forEach((line,i)=>ctx.fillText(line,360,600+(i-(slide.lines.length-1)/2)*92,620));
 }else{
  ctx.font='38px "Songti SC","Noto Serif CJK SC",serif';title.forEach((l,i)=>ctx.fillText(l,360,380+i*55,600));
  ctx.font='28px "Songti SC","Noto Serif CJK SC",serif';author.forEach((l,i)=>ctx.fillText(l,360,900+i*32,600));
  if(slide.kind==='outro'){ctx.font='24px serif';ctx.fillText('一字一句，皆有来处。',360,1120);}
 }
 ctx.globalAlpha=1;ctx.fillStyle=dark?'#b9c7bd':'#85634c';ctx.font='20px serif';ctx.fillText(poem.demo!==false?'古典诗词示例':'原创诗作 · '+(poem.composedOn||poem.composed_on||''),360,1180);
}
let existing=null;
export async function openVideoStudio(poem){
 if(existing){existing.close();existing.remove();}
 const dialog=document.createElement('dialog');existing=dialog;dialog.className='video-studio';
 dialog.innerHTML=`<div class="video-head"><h2>制作诗词视频</h2><button type="button" id="video-close">关闭</button></div>
 <p>本机制作 · 720×1280 · 24fps。导出需保持此页面前台运行，耗时约等于视频时长。图片和音频不会上传。</p>
 <div class="video-options"><label>模板<select id="video-theme"><option value="paper">纸本水墨</option><option value="dark">深色诗笺</option></select></label>
 <label>时长（秒）<input id="video-duration" type="number" min="10" max="45" value="15" /></label>
 <label>自己的背景图片<input id="video-photo" type="file" accept="image/*" /></label>
 <label>自己的配乐 / 朗读<input id="video-audio" type="file" accept="audio/*" /></label></div>
 <canvas id="video-canvas" width="720" height="1280" aria-label="诗词视频预览"></canvas>
 <div class="video-controls"><button id="video-preview" type="button">播放预览</button><button id="video-export" type="button">生成视频</button><button id="video-cancel" type="button" disabled>取消</button></div>
 <p id="video-status" role="status" aria-live="polite"></p><progress id="video-progress" max="100" value="0"></progress>
 <video id="video-result" controls playsinline hidden></video><a id="video-download" hidden download>下载视频</a>
 <p>浏览器支持时输出 MP4，否则输出真实 WebM。若手机不支持导出，请用桌面 Chrome / Edge；微信内可先下载，再使用系统分享。</p>`;
 document.body.append(dialog);dialog.showModal();
 const $=id=>dialog.querySelector('#'+id),canvas=$('video-canvas'),message=$('video-status');
 let photo=null,outputURL=null,cancel=null,running=false;
 const duration=()=>{const d=Number($('video-duration').value);if(!Number.isFinite(d)||d<10||d>45)throw Error('时长请选择 10–45 秒。');return d;};
 const render=(t,timeline)=>drawFrame(canvas,poem,timeline,t,$('video-theme').value,photo);
 function idle(){try{const tl=buildTimeline(poem,duration());render(.8,tl);}catch(e){message.textContent=e.message;}}
 function lock(value){running=value;dialog.querySelectorAll('.video-options input,.video-options select,#video-preview,#video-export').forEach(e=>e.disabled=value);$('video-cancel').disabled=!value;}
 function cleanup(){$('video-result').pause();$('video-result').removeAttribute('src');$('video-result').load();cancel?.();if(outputURL)URL.revokeObjectURL(outputURL);photo?.close();if(existing===dialog)existing=null;dialog.remove();}
 $('video-close').onclick=()=>{if(running){message.textContent='请先取消当前生成，再关闭。';return;}dialog.close();};
 dialog.addEventListener('cancel',e=>{if(running){e.preventDefault();message.textContent='请先取消生成。';}});dialog.addEventListener('close',cleanup,{once:true});
 $('video-cancel').onclick=()=>cancel?.();
 $('video-theme').onchange=idle;$('video-duration').onchange=idle;
 $('video-photo').onchange=async()=>{try{const f=$('video-photo').files[0];photo?.close();photo=null;if(f){if(f.size>8*1024*1024)throw Error('请选择 8 MB 以下图片。');photo=await createImageBitmap(f);if(photo.width*photo.height>40000000){photo.close();photo=null;throw Error('图片尺寸过大。');}}idle();}catch(e){message.textContent=e.message;}};
 async function run(record){
  if(running)return;$('video-result').pause();$('video-progress').value=0;lock(true);$("video-download").hidden=true;$("video-result").hidden=true;let stream=null,recorder=null,audioContext=null,source=null,timer=null;
  let cancelled=false,encodingError=null,statusAfter=null;cancel=()=>{cancelled=true;};
  const hidden=()=>{if(document.hidden)cancelled=true;};document.addEventListener('visibilitychange',hidden);
  try{
   const seconds=duration(),timeline=buildTimeline(poem,seconds),audio=$('video-audio').files[0];
   if(audio&&audio.size>30*1024*1024)throw Error('请选择 30 MB 以下音频。');
   let buffer=null;
   if(audio){audioContext=new AudioContext();await audioContext.resume();buffer=await audioContext.decodeAudioData(await audio.arrayBuffer());}
   await document.fonts.ready;
   if(cancelled)throw new DOMException('Cancelled','AbortError');
   const blobs=[];let finished=null;
   if(record){
    if(!canvas.captureStream||!globalThis.MediaRecorder)throw Error('当前浏览器不支持视频导出，请使用桌面 Chrome / Edge。');
    const candidates=audio?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus']:['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp9','video/webm;codecs=vp8'];
    const mime=candidates.find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw Error('没有可用的视频编码器，请使用桌面 Chrome / Edge。');
    render(0,timeline);stream=canvas.captureStream(24);
    if(audioContext){const dest=audioContext.createMediaStreamDestination();source=audioContext.createBufferSource();source.buffer=buffer;source.connect(dest);stream.addTrack(dest.stream.getAudioTracks()[0]);}
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000,audioBitsPerSecond:128000});
    finished=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)blobs.push(e.data);};recorder.onstop=resolve;recorder.onerror=()=>{encodingError=Error('编码失败，请重试或换用桌面浏览器。');resolve();};});
    recorder.start(250);
   }else if(audioContext){source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);}
   source?.start();const start=performance.now();
   message.textContent=record?'正在编码，请保持页面在前台…':'正在预览（与导出使用相同时间轴）…';
   await new Promise((resolve,reject)=>{timer=setInterval(()=>{try{if(encodingError){reject(encodingError);return;}if(cancelled){reject(new DOMException('Cancelled','AbortError'));return;}const elapsed=(performance.now()-start)/1000;render(Math.min(elapsed,seconds-.001),timeline);$('video-progress').value=Math.min(100,elapsed/seconds*100);if(elapsed>=seconds)resolve();}catch(e){reject(e);}},1000/24);});
   clearInterval(timer);timer=null;
   if(record){recorder.stop();await finished;const mime=recorder.mimeType,blob=new Blob(blobs,{type:mime});if(blob.size<1000)throw Error('导出为空，请换浏览器重试。');
    if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);const ext=mime.startsWith('video/mp4')?'mp4':'webm';
    $('video-result').src=outputURL;$('video-result').hidden=false;$('video-download').href=outputURL;$('video-download').download='poetry-lyric.'+ext;$('video-download').hidden=false;$('video-download').textContent='下载 '+ext.toUpperCase()+' 视频';
    message.textContent='视频已生成，请播放检查后下载。格式：'+ext.toUpperCase()+'，'+seconds+' 秒。';
   }else message.textContent='预览结束，可生成视频。';
  }catch(e){statusAfter=e.name==='AbortError'?'已取消；本次未生成文件。':e.message;}
  finally{if(timer)clearInterval(timer);if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());try{source?.stop();}catch{}await audioContext?.close();document.removeEventListener('visibilitychange',hidden);cancel=null;lock(false);if(statusAfter)message.textContent=statusAfter;}
 }
 $('video-preview').onclick=()=>void run(false);$('video-export').onclick=()=>void run(true);idle();
}
