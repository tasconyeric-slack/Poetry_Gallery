import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validate(input){
  if(!Array.isArray(input)||!input.length)throw Error('Expected a non-empty JSON array');
  const ids=new Set();
  return input.map((p,i)=>{
    const fail=()=>{throw Error(`Invalid fields at record ${i+1} (content withheld)`);};
    if(!p||typeof p!=='object'||!uuid.test(p.id))fail();
    const id=p.id.toLowerCase();
    if(ids.has(id))throw Error(`Duplicate id at record ${i+1}`);
    ids.add(id);
    for(const [key,max,required] of [['title',120,true],['body',30000,true],['author',120,false],['note',5000,false]]){
      if(p[key]!==undefined&&p[key]!==null&&typeof p[key]!=='string')fail();
      if(required&&(!p[key]||!p[key].trim()))fail();
      if((p[key]?.length||0)>max||p[key]?.includes('\0'))fail();
    }
    if(!['五言','七言','词','其他'].includes(p.genre)||!['draft','published'].includes(p.status))fail();
    if(p.composed_on && (!/^\d{4}-\d{2}-\d{2}$/.test(p.composed_on)||
      !Number.isFinite(Date.parse(p.composed_on))||new Date(p.composed_on).toISOString().slice(0,10)!==p.composed_on))fail();
    return {id,title:p.title,body:p.body.replace(/\r\n?/g,'\n'),author:p.author||null,
      genre:p.genre,note:p.note||null,composed_on:p.composed_on||null,status:p.status};
  });
}
const quote=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
export function toSql(records,date=new Date().toISOString()){
  return validate(records).map(p=>{
    const fields=['id','title','author','body','genre','note','composed_on','status'];
    const values=fields.map(k=>quote(p[k]));
    return `INSERT INTO poems (${fields.join(',')},created_at,updated_at,published_at) VALUES (${values.join(',')},${quote(date)},${quote(date)},${p.status==='published'?quote(date):'NULL'}) ON CONFLICT(id) DO UPDATE SET ${fields.slice(1).map(k=>`${k}=excluded.${k}`).join(',')},updated_at=excluded.updated_at,published_at=CASE WHEN excluded.status='published' THEN COALESCE(poems.published_at,excluded.published_at) ELSE NULL END;`;
  }).join('\n')+'\n';
}
function main(){
  const args=process.argv.slice(2),file=args.shift();
  if(!file)throw Error('Usage: node scripts/import-poems.mjs PRIVATE.json [--sql PRIVATE.sql] [--apply --local | --apply --remote --confirm]');
  const allowed=new Set(['--sql','--apply','--local','--remote','--confirm']);
  let output;
  for(let i=0;i<args.length;i++){
    if(!allowed.has(args[i]))throw Error('Unknown option');
    if(args[i]==='--sql'){output=args[++i];if(!output||output.startsWith('--'))throw Error('Missing SQL output path');}
  }
  const records=validate(JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,'')));
  const sql=toSql(records);
  if(output)writeFileSync(output,sql,{mode:0o600,flag:'wx'});
  if(!args.includes('--apply')){console.log(`Validated ${records.length} records. Dry run; no database changes.`);return;}
  const remote=args.includes('--remote'),local=args.includes('--local');
  if(remote===local||remote&&!args.includes('--confirm'))throw Error('Apply requires --local or --remote --confirm');
  // Never accept a caller-specified target, config, database or account.
  const root=fileURLToPath(new URL('../',import.meta.url));
  const config=readFileSync(join(root,'wrangler.toml'),'utf8');
  if(!config.includes('database_name = "poetry-gallery-d1"')||!config.includes('database_id = "6f92588b-0a92-41c6-ad43-ae014f6112fe"'))throw Error('Unexpected database configuration');
  const dir=mkdtempSync(join(tmpdir(),'poetry-import-'));
  try{
    const path=join(dir,'private.sql');writeFileSync(path,sql,{mode:0o600});
    const command=['wrangler@4','d1','execute','poetry-gallery-d1',remote?'--remote':'--local','--file',path];
    // Use argument arrays. Wrangler errors can echo SQL: withhold its output.
    const result=process.platform==='win32'
      ?spawnSync('cmd.exe',['/d','/s','/c','npx --yes '+command.map(x=>'"'+x.replaceAll('"','')+'"').join(' ')],{cwd:root,encoding:'utf8'})
      :spawnSync('npx',['--yes',...command],{cwd:root,encoding:'utf8'});
    if(result.status!==0)throw Error('Wrangler import failed; output withheld to protect private content. Check credentials, migrations and database availability.');
    console.log(`Applied ${records.length} records to poetry-gallery-d1 (${remote?'remote':'local'}).`);
  }finally{rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(error){console.error(error instanceof SyntaxError?'Invalid UTF-8 JSON (content withheld)':error.message);process.exitCode=1;}
}
