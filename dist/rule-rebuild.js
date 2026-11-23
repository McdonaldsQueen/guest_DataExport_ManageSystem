/* Rebuild from preserved source rows, replaying explicit, traceable review edits. */
(function(root){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
const fields={name:8,title:9,nationality:10,status:16,short:2};
const unitFields={name:1,short:2,country:3,type:4,primaryNature:5,institution:6,industry:7};
function rebuild(data,baseGuests,profile,baseConfig,{edits={},reviewed={},log=[]}={}){
 const config=root.RuleProfiles.config(baseConfig,profile),engine=root.Processing.create(config),warnings=[];
 if(!data.rawRecords?.length){
  const before=data.ruleProfile?.settings||root.RuleProfiles.settings;
  const structural=['pendingMode','blankMode','mergeNamedGuests','mergeAnonymousAcrossOwners','useCompanyAliases','titleSelection','naturePriority','worldYears','usePrivateRanking','cityToChina','industryConflict','countryConflict'];
  const dictionaries=['industryAliases','companyAliasesExtra','countryAliases','nationalityAliases'];
  if(data.guests.length&&(structural.some(k=>JSON.stringify(before[k])!==JSON.stringify(profile.settings[k]))||dictionaries.some(k=>JSON.stringify(data.ruleProfile?.[k]||baseConfig[k]||{})!==JSON.stringify(profile[k]))))throw Error('该批次缺少原始记录，无法重新归并、分类或改变统计范围；请先导入原始Excel');
  const out=clone(data);out.ruleProfile=clone(profile);engine.screen(out);return{data:out,baseGuests:clone(baseGuests),edits:clone(edits),reviewed:clone(reviewed),warnings};
 }
 const file=data.baseline.source||'上传文件',sourceKey=r=>JSON.stringify([r.file||file,r.sheet||'主会场',r.line]);
 const originals=clone(data.rawRecords),rows=clone(originals),bySource=new Map(rows.map(r=>[sourceKey(r),r]));
 const baseMap=new Map(baseGuests.map(g=>[g.id,g])),oldBySource=new Map();
 for(const g of data.guests){
  const baseline=baseMap.get(g.id),patch=edits[g.id]||{};
  for(const source of g.sources||[]){const k=sourceKey(source);oldBySource.set(k,g);const r=bySource.get(k);if(!r)continue;
   for(const [field,index]of Object.entries(fields))if(baseline?String(g[field]??'')!==String(baseline[field]??''):field in patch){r.values[index]=field==='status'&&g[field]==='空白'?'':String(g[field]??'')}
  }
 }
 // Unit edits are explicit in the audit log; do not overwrite raw secondary nature tags merely with their primary classification.
 for(const entry of log.filter(x=>x.unit&&x.before&&x.after)){
  const sources=data.guests.filter(g=>g.unitId===entry.unit).flatMap(g=>g.sources||[]);
  for(const [field,index]of Object.entries(unitFields))if(String(entry.before[field]??'')!==String(entry.after[field]??''))for(const source of sources){const r=bySource.get(sourceKey(source));if(r)r.values[index]=String(entry.after[field]??'')}
 }
 const importAliases=clone(data.importAliases||data.customAliases||{}),aliases={...importAliases};
 const options={fileName:file,date:data.baseline.date,aliases};
 const pristine=engine.fromRecords(originals,data,options),out=engine.fromRecords(rows,data,options);
 // Keep original input, not rewritten rows, so switching back never treats a previous rule result as the new source.
 out.rawRecords=originals;out.importAliases=importAliases;
 const keySet=g=>(g.sources||[]).map(sourceKey).sort().join('|'),pristineBySources=new Map(pristine.guests.map(g=>[keySet(g),g]));
 const newBase=[],newEdits={},newReviewed={};
 for(const g of out.guests){
  const old=[...new Set((g.sources||[]).map(s=>oldBySource.get(sourceKey(s))).filter(Boolean))];
  const exact=old.length===1&&keySet(old[0])===keySet(g);
  if(exact)g.id=old[0].id;
  const original=pristineBySources.get(keySet(g));
  newBase.push(original?{...clone(original),id:g.id,unitId:g.unitId}:clone(g));
  if(!original&&old.some(x=>edits[x.id]))warnings.push('归并关系变化后部分单条恢复目标已变化，请用批次备份追溯原结构');
  if(exact&&old[0].priorityReview)g.priorityReview=clone(old[0].priorityReview);
  else if(old.some(x=>x.priorityReview))warnings.push('归并关系变化，部分重点人工核实需重新进行');
  if(exact&&reviewed[old[0].id])newReviewed[g.id]=true;
  const b=newBase.at(-1),patch={};for(const field of Object.keys(fields))if(String(g[field]??'')!==String(b[field]??''))patch[field]=g[field];
  if(Object.keys(patch).length)newEdits[g.id]={...patch,note:exact?edits[old[0].id]?.note||'按原来源保留核对修改':'按来源重放核对修改'};
 }
 engine.screen(out);return{data:out,baseGuests:newBase,edits:newEdits,reviewed:newReviewed,warnings:[...new Set(warnings)]};
}
root.RuleRebuild={rebuild};
})(globalThis);
