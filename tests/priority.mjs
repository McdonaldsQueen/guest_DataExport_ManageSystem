import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync('dist/processing-rules.json','utf8'));
const base=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const ctx={structuredClone};vm.createContext(ctx);
for(const file of ['priority-rules.js','processing.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);
const engine=ctx.Processing.create(config);
function sample(title,{nature='9.民营企业',name='测试企业甲',type='意向投资企业',industry='金融',status='是',person='测试嘉宾'}={}){
 const values=Array(22).fill('');Object.assign(values,{1:name,2:'测试简称',3:'中国',4:type,5:type==='意向投资企业'?nature:'',6:type==='招商合作机构'?'商协会':'',7:industry,8:person,9:title,10:'中国',13:'南山区',16:status});
 return engine.fromRecords([{line:2,values}],base);
}
const guest=d=>d.guests[0];
const include=(d,msg)=>assert.equal(guest(d).priority,true,msg);
const pending=(d,msg)=>{assert.equal(guest(d).priority,false,msg);assert.equal(guest(d).priorityCandidate,true,msg)};
function review(d,changes={}){guest(d).priorityReview={decision:'include',scope:'subject',current:'current',note:'邀请单位已核实当前实际决策职责',title:guest(d).title,unitSignature:ctx.PriorityRules.signature(d.units[0]),...changes};engine.screen(d)}
include(sample('集团总经理',{nature:'5.中央企业'}),'state GM admitted');
include(sample('党委书记',{nature:'8.国有企业'}));
include(sample('集团副总经理',{nature:'8.国有企业'}));
const secondary=sample('集团总经理',{nature:'6.上市公司'});secondary.units[0].natures.push('中央企业');engine.screen(secondary);include(secondary);
const subsidiary=sample('测试子公司总经理',{name:'测试子公司',nature:'8.国有企业'});include(subsidiary);assert.equal(guest(subsidiary).priorityScope,'subject');
pending(sample('集团总经理'));
const department=sample('市场部总经理',{nature:'5.中央企业'});pending(department);review(department,{scope:'group'});assert.equal(guest(department).priority,false);
include(sample('中国区总经理',{nature:'4.外资企业'}));
include(sample('大中华区负责人',{nature:'4.外资企业'}));
include(sample('全球主席',{nature:'4.外资企业'}));
include(sample('中国区主席',{nature:'4.外资企业'}));
pending(sample('中国区市场负责人',{nature:'4.外资企业'}));
pending(sample('主席',{nature:'4.外资企业'}));
include(sample('创始人兼CEO'));
include(sample('Global President',{nature:'4.外资企业'}));
assert.equal(guest(sample('Global President',{nature:'4.外资企业'})).senior,false);
const founder=sample('联合创始人');pending(founder);
const before={units:founder.baseline.units,guests:founder.baseline.guests,senior:founder.baseline.senior};review(founder);include(founder);
assert.deepEqual({units:founder.baseline.units,guests:founder.baseline.guests,senior:founder.baseline.senior},before);
const unknownCurrent=sample('创始人');review(unknownCurrent,{current:'unknown'});pending(unknownCurrent);
const unknownScope=sample('创始人');review(unknownScope,{scope:'unknown'});pending(unknownScope);
const noEvidence=sample('创始人');review(noEvidence,{note:''});pending(noEvidence);
const exclusion=sample('总裁');review(exclusion,{decision:'exclude'});assert.equal(guest(exclusion).priority,false);assert.equal(guest(exclusion).priorityCandidate,false);assert.equal(guest(exclusion).senior,true);
include(sample('管理合伙人',{name:'测试投资企业'}));
include(sample('高级合伙人',{name:'测试律师事务所',industry:'营利性服务业'}));
pending(sample('合伙人',{name:'测试投资企业'}));
pending(sample('管理合伙人',{name:'测试制造企业',industry:'传统制造业'}));
const partner=sample('合伙人',{name:'测试投资企业'});review(partner);include(partner);
const chair=sample('会长',{type:'招商合作机构'});include(chair);assert.equal(guest(chair).priorityTier,'C');
pending(sample('副会长',{type:'招商合作机构'}));
for(const title of ['董事长助理','前任总经理','原总经理','已卸任主席','Assistant Vice President']){const d=sample(title,{nature:'5.中央企业'});review(d);assert.equal(guest(d).priority,false,title)}
const stale=sample('创始人');review(stale);guest(stale).title='联合创始人';engine.screen(stale);pending(stale);assert.ok(guest(stale).priorityReasons.some(r=>r.includes('已变更')));
const staleUnit=sample('创始人');review(staleUnit);staleUnit.units[0].name='更正主体名称';engine.screen(staleUnit);pending(staleUnit);
const incomplete=sample('创始人');guest(incomplete).short='';review(incomplete);pending(incomplete);
for(const status of ['待定','空白','否']){const d=sample('创始人兼CEO',{status});assert.equal(guest(d).priority,false);assert.equal(guest(d).priorityCandidate,false)}
const noPerson=sample('创始人兼CEO',{person:'待定'});assert.equal(guest(noPerson).priority,false);assert.equal(guest(noPerson).priorityCandidate,false);
const snapshot=structuredClone(founder);engine.screen(snapshot);include(snapshot);
assert.equal(founder.baseline.priorityRuleDate,'2026-11-23-v0.3');
assert.ok(founder.rules.some(r=>r.name==='重点嘉宾确认规则.md'&&r.text.includes('创始人')));
console.log('PASS: contextual priority roles, secondary state tags, English titles, evidence gates, institutions, exclusions, stale review invalidation and legacy count invariance.');
