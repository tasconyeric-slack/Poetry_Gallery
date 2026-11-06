// Local-only archive recovery: validates before a transaction, refuses collisions.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validate} from './import-poems.mjs';
export function restoreArchive(db,archive){
 if(archive.format!=='poetry-gallery-backup-v2'||!Array.isArray(archive.poems)||!Array.isArray(archive.revisions)||!Array.isArray(archive.covers))throw Error('Incomplete archive');
 if(archive.poems.length)validate(archive.poems);
 const ids=new Set(archive.poems.map(p=>p.id));
 const coverIds=new Map(archive.covers.map(c=>[c.id,c.poem_id]));
 if(coverIds.size!==archive.covers.length)throw Error('Duplicate cover');
 for(const p of archive.poems)if(!Number.isInteger(p.version)||p.version<1||(p.cover_id&&coverIds.get(p.cover_id)!==p.id))throw Error('Invalid poem version or missing cover');
 for(const r of archive.revisions){validate([{...r,id:r.poem_id}]);if(!ids.has(r.poem_id)||!Number.isInteger(r.version)||r.version<1||r.version>=archive.poems.find(p=>p.id===r.poem_id)?.version)throw Error('Invalid revision');}
 for(const c of archive.covers)if(!ids.has(c.poem_id)||!['image/jpeg','image/png','image/webp'].includes(c.media_type)||typeof c.base64!=='string'||c.base64.length>800000)throw Error('Invalid cover');
 for(const r of archive.revisions)if(r.cover_id&&coverIds.get(r.cover_id)!==r.poem_id)throw Error('Missing revision cover');
 const tables=[['poems',archive.poems,['id','title','author','body','genre','note','composed_on','status','cover_id','created_at','updated_at','published_at','version']],['covers',archive.covers,['id','poem_id','media_type','base64','created_at']],['poem_revisions',archive.revisions,['poem_id','version','title','author','body','genre','note','composed_on','status','cover_id','saved_at']]];
 db.exec('BEGIN IMMEDIATE');
 try{for(const [table,rows,fields] of tables){const stmt=db.prepare(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`);for(const row of rows)stmt.run(...fields.map(f=>row[f]??null));}db.exec('COMMIT');}
 catch(e){db.exec('ROLLBACK');throw Error('Restore refused; database unchanged (invalid records or existing IDs).');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [file,flag,target]=process.argv.slice(2);
 if(flag!=='--local'||!target||!file)throw Error('Usage: node scripts/restore-archive.mjs PRIVATE.json --local private/recovery.sqlite');
 const db=new DatabaseSync(target);db.exec('PRAGMA foreign_keys=ON');
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name='poems'").get())for(const f of ['0001_poems.sql','0002_author.sql','0003_revisions.sql'])db.exec(readFileSync('worker/migrations/'+f,'utf8'));
 restoreArchive(db,JSON.parse(readFileSync(file,'utf8')));db.close();console.log('Archive restored locally. No remote writes.');
}
