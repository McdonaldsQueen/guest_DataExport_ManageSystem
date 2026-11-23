(function priorityPolicy(root){
'use strict';
const version='2026-11-23-v0.3';
const norm=v=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,'');
const id=v=>norm(v).replace(/^中国(?:香港|澳门|台湾)/,'').replace(/(?:股份有限公司|有限责任公司|集团有限公司|有限公司|集团|公司)+$/,'').toLowerCase();
const signature=u=>JSON.stringify([u.id,u.name,u.canonicalKey,u.type,u.primaryNature,u.institution,u.natures,u.worlds,u.private]);
function assess(g,u,settings={}){
 const allow=settings.priorityRoles||root.RuleProfiles.settings.priorityRoles;
 const t=norm(g.title),notes=[],reasons=[];
 const state=allow.includes('state')&&/中央企业|国有企业|央企|国企/.test([u.primaryNature,...u.natures||[]].join('|'));
 const foreign=allow.includes('foreign')&&(/外资企业|世界500强\(外企\)/.test([u.primaryNature,...u.natures||[]].join('|'))||Object.values(u.worlds||{}).some(w=>w.country&&!['中国','China','中国大陆'].includes(w.country)));
 const professional=/会计|审计|律师|法律|咨询|投资|资本|基金|合伙|金融/.test([u.name,u.industry].join('|'));
 const institution=u.type==='招商合作机构';if(institution&&!allow.includes('institution'))return{potential:false,eligible:false,scope:'unknown',notes:[],reasons:[],version};
 const founder=allow.includes('founder')&&/创始人|co-?founder|founder/i.test(t),partner=allow.includes('partner')&&/合伙人|partner/i.test(t),chair=allow.includes('foreign')&&/主席|chair(?:man|person)/i.test(t),gm=/总经理|generalmanager/i.test(t),party=/党委(?:副)?书记/.test(t);
 const executive=g.senior||/\b(?:president|vice\s*president)\b/i.test(g.title||'');
 const china=/(?:中国区|大中华区)(?:主席|董事长|总裁|总经理|负责人|chair(?:man|person)|president|generalmanager|head)/i.test(t);
 const regionCandidate=/中国区|大中华区/.test(t)&&/负责人|总经理|总监|head|manager/i.test(t);
 const group=/集团|总部|全球|global|worldwide/i.test(t);
 const department=/事业部|业务部|市场部|销售部|财务部|投资部|研发部|部门|办事处/.test(t);
 const functional=/政府事务|公共事务|公司事务|公共关系|市场|营销|销售|财务|人力|采购|法务|研发|业务/.test(t);
 const branch=/分公司|子公司|分行|支行|分会|委员会/.test(t);
 const exactSubject=[u.name,u.canonicalKey].some(n=>id(n).length>=3&&id(t).startsWith(id(n)));
 const sameSource=(g.sourceEntities||[]).length===1&&(g.sourceEntities||[]).some(n=>id(n)===id(u.canonicalKey||u.name));
 let scope=china?'china':group?'group':exactSubject||sameSource?'subject':'unknown';
 const potential=institution?/会长|理事长|主席/.test(t):executive||founder||partner||chair||gm||party||china||regionCandidate;
 let eligible=false,hard=false;
 if(!potential)return{potential:false,eligible:false,scope,notes,reasons,version};
 if(/助理|秘书|assistant/i.test(t)||/(?:董事长|总裁|主席)办公室/.test(t))return{potential:true,eligible:false,excluded:true,hard:true,scope:'department',notes:['助理、秘书或办公室岗位不按主要负责人纳入'],reasons:[],version};
 if(/前任|原任|离任|卸任|退休|曾任|former|retired/i.test(t)||/^原(?:董事长|总裁|总经理|主席|党委书记)/.test(t))return{potential:true,eligible:false,excluded:true,hard:true,scope,notes:['明确已离任，不按现任负责人纳入'],reasons:[],version};
 if(institution){
  eligible=/会长|理事长|主席/.test(t)&&!/副|名誉|荣誉|轮值|分会|委员会|代理/.test(t);notes.push('机构主要负责人');
  if(!eligible)reasons.push('机构职务层级、任职状态或所属范围待核实');
 }else if(u.type!=='意向投资企业'){reasons.push('单位类型待核实')}
 else{
  if(regionCandidate&&!china)reasons.push('区域职务未明确为整体经营负责人，需核对职能范围');
  if(executive){eligible=true;notes.push(g.senior?'符合原高职级职务识别规则':'明确企业总裁／副总裁英文职务')}
  if(state&&(gm||party)){
   notes.push('央国企经营或党委主要负责人及相应副职');
   if(department||(branch&&!exactSubject)){eligible=false;scope='department';reasons.push('部门或下属单位任职范围待核实，不能按集团负责人纳入')}
   else if(scope==='unknown')reasons.push('央国企负责人对应的参会主体范围待核实');else eligible=true;
  }else if(gm&&!china&&!g.senior){notes.push('总经理职务候选');reasons.push('企业性质及总经理实际决策层级待核实')}
  if(foreign&&china){notes.push('外资企业中国区或大中华区整体经营负责人');if(functional||department){eligible=false;scope='department';reasons.push('业务职能负责人不直接等同中国区一把手')}else eligible=true}
  if(china&&!foreign&&!g.senior){notes.push('区域经营负责人候选');reasons.push('企业性质及区域整体经营权限待核实')}
  if(chair){notes.push('企业主席职务');if(foreign&&(china||group||exactSubject))eligible=true;else if(!g.senior)reasons.push('主席的任职主体与实际决策权限待核实')}
  if(founder){notes.push('创始人或联合创始人候选');if(!g.senior&&!eligible)reasons.push('企业阶段及创始人当前参与经营决策情况待核实')}
  if(partner){
   notes.push('合伙人职务候选');
   const managing=/管理合伙人|执行合伙人|首席合伙人|高级合伙人|managingpartner|executivepartner|seniorpartner/i.test(t);
   if(managing&&professional&&!department&&scope!=='unknown')eligible=true;
   else if(!eligible)reasons.push('合伙人的管理决策权限、专业服务背景或任职范围待核实');
  }
  if(department&&!g.senior){eligible=false;scope='department';reasons.push('普通部门负责人不能直接视作企业主要负责人')}
  if(/名誉|荣誉|代理|候任/.test(t))reasons.push('当前任职状态待核实');
  if(eligible&&scope==='unknown')reasons.push('职务对应集团、区域或参会主体范围待核实');
  if(eligible&&(g.sourceEntities||[]).length>1&&!group&&!china&&!exactSubject)reasons.push('多个来源主体下的裸职务任职范围待核实');
 }
 let manual=false,excluded=false;const review=g.priorityReview;
 if(review&&review.decision!=='auto'){
  const fresh=review.title===g.title&&review.unitSignature===signature(u);
  if(!fresh){eligible=false;reasons.push('职务或单位信息已变更，请重新核实重点筛选依据')}
  else if(review.decision==='exclude'){eligible=false;excluded=true;reasons.length=0;notes.push('业务核实后排除：'+review.note)}
  else if(review.decision==='include'){
   if(review.note?.trim()&&review.current==='current'&&['group','china','subject'].includes(review.scope)&&!(department&&!g.senior)){eligible=true;manual=true;scope=review.scope;reasons.length=0;notes.push('业务核实后纳入：'+review.note)}
   else{eligible=false;reasons.push('人工纳入需填写依据、确认当前任职并明确经营范围')}
  }else{eligible=false;reasons.push('人工标记为重点候选待核对')}
 }
 return{potential,eligible:eligible&&!reasons.length&&!excluded,excluded,hard,scope,notes:[...new Set(notes)],reasons:[...new Set(reasons)],manual,version};
}
root.PriorityRules={version,signature,assess};
})(globalThis);

