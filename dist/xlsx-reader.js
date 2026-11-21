/* XLSX parsing adapter. JSZip and SAX are vendored with their licenses. */
(function(root){
'use strict';
function parseXml(text){const doc={name:'document',children:[],text:''},stack=[doc],p=root.sax.parser(true,{});p.onopentag=t=>{const n={name:t.name.split(':').at(-1),attrs:t.attributes,children:[],text:''};stack.at(-1).children.push(n);stack.push(n)};p.onclosetag=()=>stack.pop();p.ontext=p.oncdata=t=>stack.at(-1).text+=t;p.write(text).close();return doc.children[0]}
const child=(n,k)=>n?.children.find(x=>x.name===k),children=(n,k)=>n?.children.filter(x=>x.name===k)||[];
const rich=n=>(child(n,'t')?.text||'')+children(n,'r').map(x=>child(x,'t')?.text||'').join('');
const col=s=>[...s].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
function coord(ref){const m=/^([A-Z]+)(\d+)$/.exec(ref||'');return m?[+m[2]-1,col(m[1])]:null}
const resolve=p=>{let a=[];for(const x of p.split('/')){if(x==='..')a.pop();else if(x&&x!=='.')a.push(x)}return a.join('/')};
async function read(input){const bytes=input instanceof ArrayBuffer||ArrayBuffer.isView(input)?input:await input.arrayBuffer();if(bytes.byteLength>20*1024*1024)throw Error('文件超过20MB，请拆分后导入');const zip=await root.JSZip.loadAsync(bytes);let expanded=0;async function text(path){const entry=zip.file(path);if(!entry)return '';const s=await entry.async('string');expanded+=s.length;if(s.length>40*1024*1024||expanded>80*1024*1024)throw Error('工作簿内容过大，请拆分后导入');return s}
const wb=parseXml(await text('xl/workbook.xml')),rels=parseXml(await text('xl/_rels/workbook.xml.rels')),relation=Object.fromEntries(children(rels,'Relationship').map(x=>[x.attrs.Id,resolve(x.attrs.Target.startsWith('/')?x.attrs.Target:'xl/'+x.attrs.Target)]));const ss=await text('xl/sharedStrings.xml'),strings=ss?children(parseXml(ss),'si').map(rich):[];const result=[];
for(const sheet of children(child(wb,'sheets'),'sheet')){const path=relation[sheet.attrs['r:id']];if(!path)continue;const source=await text(path);if(!source)continue;const dom=parseXml(source),rows=[];for(const row of children(child(dom,'sheetData'),'row')){const i=Number(row.attrs.r)-1;if(i<0||i>=20000)throw Error('每张表最多支持20000行；请拆分文件，系统不会静默截断');const out=[];for(const cell of children(row,'c')){const pos=coord(cell.attrs.r);if(!pos||pos[1]>255)continue;const v=child(cell,'v')?.text||'';out[pos[1]]=cell.attrs.t==='s'?strings[Number(v)]||'':cell.attrs.t==='inlineStr'?rich(child(cell,'is')):cell.attrs.t==='b'?(v==='1'?'是':'否'):cell.attrs.t==='e'?'':v}rows[i]=out}
const merges=children(child(dom,'mergeCells'),'mergeCell').map(m=>m.attrs.ref.split(':').map(coord)).filter(m=>m.length===2&&m.every(Boolean));result.push({name:sheet.attrs.name,rows,merges})}
return result}
root.XlsxReader={read,parseXml};
})(globalThis);
