import fs from 'node:fs';
import vm from 'node:vm';
import '../scripts/validate.mjs';
const nodes=new Map();
function node(k){if(!nodes.has(k))nodes.set(k,{innerHTML:'',textContent:'',hidden:true,style:{},addEventListener(){},querySelector(){return null}});return nodes.get(k)}
const data=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const context={console,Blob,TextEncoder,TextDecoder,DataView,Uint8Array,ArrayBuffer,URL,setTimeout,clearTimeout,structuredClone,Map,Set,Intl,JSON,Math,Date,FormData,location:{hash:'#overview'},localStorage:{getItem(){return null},setItem(){}},window:{addEventListener(){},scrollTo(){}},navigator:{},document:{querySelector:node,addEventListener(){},body:{style:{}}},fetch:async url=>({ok:true,json:async()=>url==='processing-rules.json'?JSON.parse(fs.readFileSync('dist/processing-rules.json','utf8')):structuredClone(data)})};
vm.createContext(context);for(const f of ['office.js','processing.js','app.js','integration.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),context);
await new Promise(r=>setTimeout(r,20));
const run=s=>vm.runInContext(s,context),assert=(v,m)=>{if(!v)throw Error(m)};
assert(run('yes().length')===data.baseline.guests,'confirmed guests match snapshot');
assert(run('yesUnits().length')===data.baseline.units,'confirmed units match snapshot');
assert(run('yes().filter(g=>g.priority).length')===data.baseline.priority,'priority matches');
assert(run('yes().filter(g=>g.senior).length')===data.baseline.senior,'senior matches');
for(const name of ['overview','units','guests','issues','departments','imports','exports','rules']){run(`location.hash='#${name}';render()`);assert(node('#main').innerHTML.length>100,`${name} rendered`);assert(!node('#main').innerHTML.includes('undefined'),`${name} no undefined`)}
run("query='演示';filter='all'");assert(run('yes().filter(match).length')===data.baseline.guests,'search');
assert(run('G.length')===0,'initial workspace has no example guests');assert(run('D.units.length')===0,'initial workspace has no example units');run("U.set('test-unit',{id:'test-unit',name:'测试单位',short:'测试',type:'意向投资企业',country:'中国',primaryNature:'9.民营企业',industry:'金融',lines:[2]});G.push({id:'test-guest',unitId:'test-unit',name:'',title:'',nationality:'',status:'是',owners:[],lines:[2]});baseG=structuredClone(G)");const oldCount=run('yes().length');run("let testGuest=yes()[0];testGuest.name='测试姓名';testGuest.title='董事长';testGuest.nationality='中国';");assert(run('guestIssues(testGuest).length')===0,'missing fields resolve');run("testGuest.status='否'");assert(run('yes().length')===oldCount-1,'attendance recalculates');
let file=run("Office.xlsx(['企业全称','企业简称','企业类型','嘉宾姓名','嘉宾职务'],guestRows(baseG.filter(g=>g.status==='是'&&g.senior)),'高管测试')");fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/export.xlsx',new Uint8Array(await file.blob.arrayBuffer()));
let doc=run("Office.docx(reportText(),'汇报测试')");fs.writeFileSync('qa/report.docx',new Uint8Array(await doc.blob.arrayBuffer()));
console.log('PASS: 8-page render smoke tests; snapshot counts; search; missing-field resolution; attendance recalculation; XLSX/DOCX generation. Browser/E2E tests are not covered.');
