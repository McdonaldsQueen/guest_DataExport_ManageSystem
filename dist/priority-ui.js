
'use strict';
const priorityScopeNames={group:'集团／总部／全球',china:'中国区／大中华区',subject:'本参会主体',department:'部门／其他下属范围',unknown:'范围待核实'};
const priorityTierNames={A:'A 榜单企业',B:'B 其他企业',C:'C 机构'};
const priorityOverview=overview;
overview=function(){return priorityOverview()+`<section class="panel"><div class="panel-body"><h2>重点嘉宾筛选</h2><p>已入选 ${yes().filter(g=>g.priority).length} 人；重点候选待核对 ${yes().filter(g=>g.priorityCandidate).length} 人。候选不计入已入选人数，高管口径与重点筛选分别配置。</p><button class="btn" data-action="view-priority-candidates">查看重点候选</button><p class="tiny">重点规则：${esc(D.baseline.priorityRuleDate||PriorityRules.version)}。集团负责人和中国区一把手同层，其他明确主体负责人随后。</p></div></section>`};
const priorityExports=renderExports;
renderExports=function(){return priorityExports()+`<section class="panel" style="margin-top:20px"><div class="panel-body"><h2>重点候选核对清单</h2><p>当前 ${yes().filter(g=>g.priorityCandidate).length} 人待核对，可查看识别依据、任职范围和原始来源。仅已入选者进入正式重点名单。</p><button class="btn primary" data-action="export-priority-candidates">导出重点候选Excel</button><button class="btn" data-action="export-priority-basis">导出重点筛选依据Excel</button></div></section>`};
const priorityExportData=exportData;
exportData=function(a){
 if(a==='export-priority'){
  const tiers={A:0,B:1,C:2},scopes={group:0,china:0,subject:1,unknown:2,department:3};
  const gs=yes().filter(g=>g.priority).sort((a,b)=>(tiers[a.priorityTier]??9)-(tiers[b.priorityTier]??9)||(scopes[a.priorityScope]??9)-(scopes[b.priorityScope]??9));
  const f=Office.xlsx(['企业全称','企业简称','企业类型','嘉宾姓名','嘉宾职务'],guestRows(gs),'重点嘉宾名单');Office.download(f.blob,f.name);return;
 }
 if(a==='export-priority-candidates'||a==='export-priority-basis'){
  const gs=yes().filter(g=>a==='export-priority-candidates'?g.priorityCandidate:g.priority||g.priorityCandidate||g.priorityDecision==='excluded');
  const rows=gs.map(g=>{const u=unit(g.unitId);return[u.name,g.short||u.short,u.type,g.name,g.title,g.priority?'已入选':g.priorityCandidate?'待核对':'已排除',priorityTierNames[g.priorityTier]||'',priorityScopeNames[g.priorityScope]||'',(g.priorityRoleReasons||[]).join('；'),(g.priorityReasons||[]).join('；'),g.priorityReview?.note||'',g.owners.join('；'),g.lines.join('、')]});
  const f=Office.xlsx(['企业全称','企业简称','单位类型','嘉宾姓名','嘉宾职务','筛选结论','排序层级','任职范围','识别依据','待核对原因','人工核实依据','邀请来源','原始行号'],rows,a==='export-priority-candidates'?'重点候选待核对':'重点筛选依据');Office.download(f.blob,f.name);return;
 }
 priorityExportData(a);
};
const priorityGuestDrawer=guestDrawer;
guestDrawer=function(id){
 priorityGuestDrawer(id);
 const g=G.find(x=>x.id===id),u=unit(g.unitId),assessment=PriorityRules.assess(g,u,D.ruleProfile?.settings);
 $('#guest-form')?.insertAdjacentHTML('afterbegin',`<label class="form-field">该条嘉宾对应企业简称<input name="short" value="${esc(g.short||'')}" placeholder="与该参会主体一致的简称"></label>`);
 if(!assessment.potential)return;
 const r=g.priorityReview||{},form=document.createElement('form');form.id='priority-review-form';
 const fresh=r.title===g.title&&r.unitSignature===PriorityRules.signature(u);
 form.innerHTML=`<h3>重点筛选核实</h3><div class="source"><p>当前结论：${g.priority?'已入选':g.priorityCandidate?'候选待核对':g.priorityDecision==='excluded'?'已排除':'未入选'}</p><p>${esc([...(g.priorityRoleReasons||assessment.notes),...(g.priorityReasons||assessment.reasons)].join('；'))}</p><p>职务：${esc(g.title)}；任职范围：${esc(priorityScopeNames[g.priorityScope]||'待核实')}</p>${r.decision&&!fresh?'<p>原人工核实已失效，请按当前职务和单位重新核实。</p>':''}</div><label class="form-field">核实结论<select name="decision">${[['auto','按自动规则'],['pending','重点候选待核对'],['include','核实后纳入'],['exclude','核实后排除']].map(([v,l])=>`<option value="${v}" ${fresh&&r.decision===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="form-field">任职范围<select name="scope">${Object.entries(priorityScopeNames).map(([v,l])=>`<option value="${v}" ${(fresh?r.scope:g.priorityScope)===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="form-field">当前经营／决策状态<select name="current">${[['unknown','尚待核实'],['current','已核实当前参与经营或决策'],['former','已离任／不参与经营决策']].map(([v,l])=>`<option value="${v}" ${fresh&&r.current===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="form-field">核实依据<input name="note" required value="${esc(fresh?r.note||'':'')}" placeholder="填写核实渠道、实际权限和结论"></label><p class="tiny">仅影响重点筛选。姓名／职务有误时先保存上方嘉宾资料，再核实。纳入仍需满足确认参会、五项完整、榜单匹配等条件。</p><button class="btn primary">保存重点核实结论</button>`;
 $('#drawer').appendChild(form);
 form.addEventListener('submit',e=>{
  e.preventDefault();const values=Object.fromEntries(new FormData(form)),note=values.note.trim();
  if(!note){toast('请填写核实依据');return}
  if(values.decision==='include'&&(assessment.hard||values.current!=='current'||!['group','china','subject'].includes(values.scope))){toast('纳入需确认当前参与经营决策、明确任职范围，且不能为明确排除岗位');return}
  const before=structuredClone(g.priorityReview||null);
  if(values.decision==='auto')delete g.priorityReview;
  else g.priorityReview={...values,note,title:g.title,unitSignature:PriorityRules.signature(u),time:new Date().toISOString()};
  log.push({time:new Date().toISOString(),guest:g.id,action:'priority-review',before,after:structuredClone(g.priorityReview||null),evidence:note});
  save();closeDrawer();render();toast(g.priority?'核实已保存，已纳入重点名单':g.priorityCandidate?'核实已保存，仍有条件待核对':'核实结论已保存');
 });
};
const priorityBatchLabel=updateBatchLabel;
updateBatchLabel=function(){priorityBatchLabel();if(D.processing)document.querySelector('footer').innerHTML+=' · 重点规则 '+esc(D.baseline.priorityRuleDate||PriorityRules.version)};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b?.dataset.action==='view-priority-candidates'){location.hash='#guests?priority=candidates';filter='candidates';query='';page=1;render()}});
window.addEventListener('hashchange',()=>{if(location.hash==='#guests?priority=candidates'){filter='candidates';query='';page=1;render()}});
const priorityReport=reportText;
reportText=function(){return priorityReport()+`\n重点筛选补充：规则版本${D.baseline.priorityRuleDate||PriorityRules.version}；另有${yes().filter(g=>g.priorityCandidate).length}名重点候选待核对，未计入重点人数。总裁及副总裁以上仍按原关键词口径统计，不因本次重点范围扩展而改变。`};



RuleWorkspace.install();
