from PIL import Image,ImageChops,ImageStat,ImageDraw
from pathlib import Path
import json
Path('docs/evidence').mkdir(exist_ok=True)
pairs=[('gallery','poema-explore-all.webp','gallery-390.png',(390,514)),('reader','poema-reader-airport-bar.webp','reader-390.png',(390,844)),('writer','popoem-writer-crop.png','writer-390.png',(390,786)),('library','popoem-library-crop.png','library-390.png',(390,790)),('collections','xcz-library-crop.png','collections-390.png',(390,677)),('card','xcz-card-crop.png','card-seal.png',(552,818))]
rows=[]
for name,ref,impl,size in pairs:
 if not Path('docs/evidence',impl).exists():continue
 a=Image.open(Path('.reference',ref)).convert('RGB').resize(size);b=Image.open(Path('docs/evidence',impl)).convert('RGB');b=b.resize((size[0],round(b.height*size[0]/b.width)));b=b.crop((0,0,size[0],size[1]))
 d=ImageChops.difference(a,b);st=ImageStat.Stat(d);pix=list(d.getdata());ratio=sum(max(p)>20 for p in pix)/len(pix)
 board=Image.new('RGB',(size[0]*3,size[1]+28),'white');dr=ImageDraw.Draw(board)
 for x,label,img in [(0,'OFFICIAL REFERENCE',a),(size[0],'IMPLEMENTATION',b),(size[0]*2,'ABSOLUTE DIFFERENCE',d)]:board.paste(img,(x,28));dr.text((x+8,7),label,fill='black')
 board.save('.reference/'+name+'-comparison.png');d.save('docs/evidence/'+name+'-diff.png');a.save('.reference/'+name+'-normalized.png');b.save('.reference/'+name+'-implementation-normalized.png')
 rows.append(dict(screen=name,size=size,threshold=20,mismatched_pixel_ratio=round(ratio,5),mean_absolute_rgb_delta=round(sum(st.mean)/3,3),scope='Matched public-domain text; native fonts differ' if name=='card' else 'Localized/adaptive structural comparison; different text, chrome and states, NOT equality score'))
Path('docs/evidence/visual-metrics.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
