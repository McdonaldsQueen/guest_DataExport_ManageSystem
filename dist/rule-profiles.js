/* Executable rule profiles. Official defaults are immutable; custom profiles are opt-in. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const settings={pendingMode:'provisional',blankMode:'provisional',mergeNamedGuests:true,mergeAnonymousAcrossOwners:true,useCompanyAliases:true,titleSelection:'preciseThenDistrict',naturePriority:[1,2,3,4,5,6,7,8,9,10],worldYears:['2025','2026'],usePrivateRanking:true,cityToChina:true,industryConflict:'pending',countryConflict:'pending',priorityRequiredFields:['fullName','short','type','name','title'],priorityChannels:['A','B','C'],priorityRoles:['state','founder','foreign','partner','institution'],seniorKeywords:['董事长','总裁','首席执行官','CEO','VP','SVP','EVP','vice president','chief executive officer','chairman'],seniorExclusions:['助理','秘书','assistant to','executive assistant','secretary']};
const modes=['confirmed','provisional','exclude'];
const mode=(status,s=settings)=>status==='是'?'confirmed':status==='待定'?s.pendingMode:status==='空白'?s.blankMode:'exclude';
const confirmed=(status,s=settings)=>mode(status,s)==='confirmed';
const included=(status,s=settings)=>mode(status,s)!=='exclude';
function validate(p){
 if(!p||p.schema!=='investment-rules-v1'||typeof p.name!=='string'||!p.name.trim()||p.name.length>80)throw Error('规则方案格式或名称无效');
 if(typeof p.version!=='string'||p.version.length>120)throw Error('规则版本无效');
 const s=p.settings;if(!s||Object.keys(s).some(k=>!Object.keys(settings).includes(k))||Object.keys(settings).some(k=>!Object.hasOwn(s,k)))throw Error('执行参数缺失或包含不支持的字段');
 for(const k of ['pendingMode','blankMode'])if(!modes.includes(s[k]))throw Error(k+'必须为confirmed、provisional或exclude');
 for(const k of ['mergeNamedGuests','mergeAnonymousAcrossOwners','useCompanyAliases','usePrivateRanking','cityToChina'])if(typeof s[k]!=='boolean')throw Error(k+'必须为布尔值');
 if(!['preciseThenDistrict','first','districtFirst'].includes(s.titleSelection))throw Error('职务择一方式无效');
 if(!['pending','first'].includes(s.industryConflict)||!['pending','first'].includes(s.countryConflict))throw Error('冲突处理方式无效');
 const arr=(a,allowed)=>Array.isArray(a)&&a.length<=100&&new Set(a).size===a.length&&a.every(x=>allowed.includes(x));
 if(!arr(s.naturePriority,[1,2,3,4,5,6,7,8,9,10])||s.naturePriority.length!==10)throw Error('性质优先级必须完整包含1至10且不重复');
 if(!arr(s.worldYears,['2025','2026'])||!s.worldYears.length)throw Error('至少选择一个已提供的世界500强年度');
 if(!arr(s.priorityRequiredFields,['fullName','short','type','name','title','nationality'])||!s.priorityRequiredFields.includes('name')||!s.priorityRequiredFields.includes('title'))throw Error('重点字段需包含姓名和职务');
 if(!arr(s.priorityChannels,['A','B','C'])||!arr(s.priorityRoles,['state','founder','foreign','partner','institution']))throw Error('重点筛选通道无效');
 for(const k of ['seniorKeywords','seniorExclusions'])if(!Array.isArray(s[k])||s[k].length>100||s[k].some(v=>typeof v!=='string'||!v.trim()||v.length>100)||k==='seniorKeywords'&&!s[k].length)throw Error('高管关键词必须为有效文字数组');
 if(!Array.isArray(p.documents)||p.documents.length<1||p.documents.length>12||p.documents.some(d=>typeof d.name!=='string'||typeof d.text!=='string'||d.text.length>200000))throw Error('规则正文无效');
 if(new Set(p.documents.map(d=>d.name)).size!==p.documents.length)throw Error('规则文档名不能重复');
 for(const k of ['industryAliases','companyAliasesExtra','countryAliases','nationalityAliases']){
  const m=p[k];if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).length>500||Object.entries(m).some(([a,b])=>['__proto__','prototype','constructor'].includes(a)||!a.trim()||a.length>200||typeof b!=='string'||!b.trim()||b.length>300))throw Error(k+'必须是有效的名称对照对象');
 }
 const targets=p.departmentTargets;if(!targets||typeof targets!=='object'||Array.isArray(targets)||Object.keys(targets).length>100||Object.entries(targets).some(([k,v])=>['__proto__','constructor','prototype'].includes(k)||!k.trim()||!Number.isFinite(v)||v<=0||v>100000))throw Error('部门指标必须是正数JSON对象');
 return copy(p);
}
function config(base,p){p=validate(p);const out=copy(base);out.version=p.version;out.executionRules=copy(p.settings);out.departmentTargets=copy(p.departmentTargets);out.ruleProfile=p;out.ruleDocuments=copy(p.documents);out.priorityRuleText=p.documents.find(d=>d.name.includes('重点嘉宾'))?.text||base.priorityRuleText;for(const k of ['industryAliases','companyAliasesExtra','countryAliases','nationalityAliases'])out[k]=copy(p[k]);for(const k of ['companyAliasesExtra','countryAliases','nationalityAliases'])out[k]=Object.fromEntries(Object.entries(out[k]).map(([a,b])=>[a.normalize('NFKC').trim().replace(/\s/g,'').toLowerCase(),b]));return out}
function senior(title,s=settings){
 if(JSON.stringify(s.seniorKeywords)===JSON.stringify(settings.seniorKeywords)&&JSON.stringify(s.seniorExclusions)===JSON.stringify(settings.seniorExclusions)){
  const role=title.replace(/(?:董事长|总裁)(?:办公室|办|室)/g,'');return !/助理|秘书|assistant\s+to|executive assistant|secretary/i.test(title)&&/董事长|总裁|首席执行官|\bceo\b|\b[se]?vp\b|vice president|chief executive officer|chairman/i.test(role);
 }
 const matches=w=>{if(/^[a-z ]+$/i.test(w)){const e=w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('\\b'+e+'\\b','i').test(title)}return title.toLowerCase().includes(w.toLowerCase())};
 return !s.seniorExclusions.some(matches)&&s.seniorKeywords.some(matches);
}
root.RuleProfiles={settings,copy,validate,config,mode,confirmed,included,senior};
})(globalThis);
