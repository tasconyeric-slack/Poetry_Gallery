// Collection membership is stored by the existing authenticated Worker.
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn,cls='collection-button')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
const view=el('section',undefined,'collections-view section-shell');view.id='collections-view';view.hidden=true;document.querySelector('main').append(view);
const heading=el('header',undefined,'collections-heading'),title=el('h1','我的诗集'),subtitle=el('p','把散落的诗句，编成自己的书。');heading.append(title,subtitle);view.append(heading);
const tools=el('div',undefined,'collections-tools'),list=el('div',undefined,'collection-grid'),detail=el('div',undefined,'collection-detail'),feedback=el('p',undefined,'collections-feedback');feedback.id='collections-feedback';feedback.role='status';feedback.setAttribute('aria-live','polite');view.append(tools,feedback,list,detail);
let loadVersion=0,current=null,ordered=[],available=[],saving=false,localId=crypto.randomUUID(),hasChanges=false;
const owner=()=>window.poetryOwner;
async function request(op,body,extras=''){
 if(owner()?.isUnlocked())return owner().api(op,body,extras);
 if(body!==undefined)throw Error('请先在写作页解锁云端存档。');
 const r=await fetch('https://poetry-gallery-api.tasconyeric.workers.dev/?op='+op+(extras?'&'+extras:''),{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'诗集暂时无法读取');return d;
}
function report(text){feedback.textContent=text;}
function link(text,hash){const a=el('a',text,'collection-button');a.href=hash;return a;}
function field(label,name,value='',multiline=false){const wrap=el('label',label),input=el(multiline?'textarea':'input');input.name=name;input.value=value;if(multiline)input.rows=3;input.addEventListener('input',()=>hasChanges=true);wrap.append(input);return wrap;}
async function route(){
 const hash=location.hash.slice(1),isActive=hash==='collections'||hash.startsWith('collection/');view.hidden=!isActive;if(!isActive)return;
 document.body.dataset.screen='collections';for(const id of ['catalog-view','admin-view','reading-view'])document.getElementById(id).hidden=true;
 const seq=++loadVersion;list.replaceChildren();detail.replaceChildren();tools.replaceChildren();report('正在翻开诗集…');
 try{
  if(hash.startsWith('collection/')){const id=hash.slice(11);const d=await request('collection-detail',undefined,'id='+encodeURIComponent(id));if(seq!==loadVersion)return;showBook(d.collection,d.poems);return;}
  title.textContent='我的诗集';subtitle.textContent='把散落的诗句，编成自己的书。';tools.append(button('＋ 新建诗集',()=>edit(null)),button('刷新',()=>void route()));
  const unlocked=owner()?.isUnlocked();const data=await request(unlocked?'owner-collections':'collections');if(seq!==loadVersion)return;
  report(unlocked?'私有诗集仅自己可见。发布诗集时，仅公开其中已发布的作品。':'当前展示公开诗集。解锁作者权限后可创建、管理私有诗集。');
  if(!unlocked)tools.append(link('解锁云端存档','#admin'));
  if(!data.collections.length){const empty=el('div',undefined,'collection-empty');empty.append(el('span','▤'),el('h2','让诗，有一本自己的书'),el('p','新建诗集，收录作品，为这一段时光命名。'));list.append(empty);}
  for(const c of data.collections){const card=el('article',undefined,'collection-card');const cover=button('',()=>{location.hash='collection/'+c.id;},'collection-cover');if(c.cover){const img=el('img');img.src=c.cover;img.alt='';img.referrerPolicy='no-referrer';cover.append(img);}cover.append(el('span',c.title),el('small',(c.poem_count||0)+' 首 · '+(c.status==='published'?'已发布':'私藏')));card.append(cover,el('h2',c.title),el('p','诗词馆 · '+(c.poem_count||0)+' 首 · '+(c.status==='published'?'公开':'私藏')));if(unlocked)card.append(button('编辑诗集',()=>edit(c)));list.append(card);}
 }catch(e){if(seq===loadVersion)report(e.message+'；请解锁或稍后重试。');}
}
async function edit(collection){
 if(!owner()?.isUnlocked()){report('创建诗集需要作者权限，请先解锁云端存档。');return;}
 const seq=++loadVersion;report('正在准备作品…');
 try{
  const d=collection?await request('collection-detail',undefined,'id='+encodeURIComponent(collection.id)):null;if(seq!==loadVersion)return;
  current=d?.collection||null;ordered=(d?.poems||[]).map(p=>p.id);available=owner().getPoems();localId=crypto.randomUUID();hasChanges=false;
  title.textContent=current?'编辑诗集':'新建诗集';subtitle.textContent='一本书，从一个名字开始。';list.replaceChildren();detail.replaceChildren();tools.replaceChildren(button('← 返回诗集',()=>{if(!hasChanges||confirm('离开会丢失未保存的诗集修改，确定离开？'))void route();}));
  const form=el('form',undefined,'collection-form');form.id='collection-form';const titleField=field('诗集名称','title',current?.title||'');titleField.querySelector('input').required=true;titleField.querySelector('input').maxLength=120;
  form.append(titleField,field('诗集简介','intro',current?.intro||'',true),field('封面图片网址（可选）','cover',current?.cover||''));
  const status=field('可见范围','status');const select=el('select');select.name='status';for(const [v,t]of [['draft','私藏 · 仅作者可见'],['published','公开 · 分享已发布作品']]){const o=el('option',t);o.value=v;select.append(o);}select.value=current?.status||'draft';status.querySelector('input').replaceWith(select);select.onchange=()=>hasChanges=true;form.append(status);
  const members=el('div',undefined,'collection-members');members.id='collection-members';form.append(el('h2','收录的作品'),el('p','同一首诗可收入多本诗集。使用上下箭头调整篇目顺序。'),members);
  function drawMembers(){members.replaceChildren();for(const id of ordered){const p=available.find(x=>x.id===id)||d?.poems.find(x=>x.id===id);if(!p)continue;const row=el('div',undefined,'collection-member'),position=ordered.indexOf(id);row.append(el('span',String(position+1).padStart(2,'0')),el('strong',p.title||'未命名'));const up=button('↑',()=>move(position,-1)),down=button('↓',()=>move(position,1)),remove=button('移出',()=>{ordered=ordered.filter(x=>x!==id);hasChanges=true;drawMembers();});up.setAttribute('aria-label','上移：'+p.title);down.setAttribute('aria-label','下移：'+p.title);remove.setAttribute('aria-label','移出：'+p.title);up.disabled=position===0;down.disabled=position===ordered.length-1;row.append(up,down,remove);members.append(row);}
   const choices=el('select');choices.id='collection-poem-choice';choices.setAttribute('aria-label','选择收录作品');const prompt=el('option','选择要收录的云端作品');prompt.value='';choices.append(prompt);for(const p of available.filter(p=>!ordered.includes(p.id))){const o=el('option',p.title+' · '+(p.status==='published'?'已发布':'私藏'));o.value=p.id;choices.append(o);}members.append(choices,button('收录作品',()=>{if(choices.value){ordered.push(choices.value);hasChanges=true;drawMembers();}}));
  }
  function move(i,offset){[ordered[i],ordered[i+offset]]=[ordered[i+offset],ordered[i]];hasChanges=true;drawMembers();}
  drawMembers();const saveButton=el('button','保存诗集','collection-button collection-primary');saveButton.type='submit';form.append(saveButton);
  form.onsubmit=async e=>{e.preventDefault();if(saving)return;saving=true;saveButton.disabled=true;report('正在保存诗集…');try{const data=Object.fromEntries(new FormData(form));const result=await request('collection-save',{...data,...(current?{id:current.id,version:current.version}:{localId}),poem_ids:ordered});current={...data,id:result.id,version:result.version};hasChanges=false;report('诗集已保存。');await route();report('诗集已保存。');}catch(err){report('保存失败：'+err.message+'。当前修改仍保留，请重试。');}finally{saving=false;saveButton.disabled=false;}};
  if(current)form.append(button('删除诗集',async()=>{if(saving||!confirm('删除这本诗集？其中的诗作和版本历史会保留。'))return;saving=true;try{await request('collection-delete',{id:current.id,version:current.version,confirm:true});hasChanges=false;await route();report('诗集已删除，作品已保留。');}catch(e){report(e.message);}finally{saving=false;}}));
  detail.append(form);report('诗集修改在点击保存后同步至云端。');
 }catch(e){report(e.message);}
}
function showBook(c,poems){
 c={...c,status:c.status||"published"};poems=poems.map(p=>({...p,status:p.status||"published"}));
 title.textContent=c.title;subtitle.textContent=c.intro||'诗成一集，岁月留痕。';tools.replaceChildren(link('← 我的诗集','#collections'),button('整本导出 / 保存 PDF',()=>printBook(c,poems)));
 if(owner()?.isUnlocked())tools.append(button('编辑篇目',()=>edit(c)));
 if(c.status==='published')tools.append(button('复制诗集链接',async()=>{const url=location.origin+location.pathname+'#collection/'+c.id;try{await navigator.clipboard.writeText(url);report('诗集链接已复制，可发送到微信。');}catch{report(url);}}));
 detail.replaceChildren();if(!poems.length)detail.append(el('p','这本诗集还没有可阅读的作品。','collection-empty'));
 for(const [i,p] of poems.entries()){const article=el('article',undefined,'collection-poem');article.append(el('span',String(i+1).padStart(2,'0'),'collection-poem-number'),el('h2',p.title),el('p',p.author||'','collection-byline'),el('div',p.body,'collection-poem-body'));if(p.status==='published')article.append(link('阅读 / 分享','#poem/'+p.id));else if(owner()?.isUnlocked())article.append(button('编辑作品',()=>owner().openPoem(p)));detail.append(article);}
 report(c.status==='published'?'公开诗集仅展示已发布作品。':'私藏诗集 · 仅作者可见');
}
function printBook(c,poems){
 const target=document.getElementById('anthology-print');target.replaceChildren();const cover=el('article',undefined,'book-title-page');cover.append(el('h1',c.title),el('p',c.intro||''),el('p',poems.length+' 首作品'));target.append(cover);
 const contents=el('article');contents.append(el('h2','目录'));const ol=el('ol');poems.forEach(p=>ol.append(el('li',p.title)));contents.append(ol);target.append(contents);
 for(const p of poems){const article=el('article');article.append(el('h2',p.title),el('p',p.author||''),el('div',p.body,'anthology-body'),el('p',p.note||''));target.append(article);}
 target.hidden=false;document.body.classList.add('print-anthology');window.print();
}
window.poetryCollections={route};window.addEventListener('hashchange',()=>void route());window.addEventListener('poetry-owner-change',()=>{if(location.hash==='#collections')void route();});window.addEventListener('beforeunload',e=>{if(hasChanges){e.preventDefault();e.returnValue='';}});void route();
