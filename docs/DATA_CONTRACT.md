# 数据接口与快照约定

前端读取 `dist/data.json`。该文件必须是已经完成业务处理的快照，不是任意原始Excel的直接JSON转换。

## 顶层结构

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| units | array | 标准参会单位，包含稳定id |
| guests | array | 嘉宾或暂未落实人选的名额，包含参会状态 |
| departments | array | 责任单位名称和任务指标 |
| districts | string[] | 归入各区页面的责任单位名称 |
| rules | array | 规则文件名与说明文本 |
| baseline | object | 日期和核定统计数，供校验 |

## 单位记录

```json
{
  "id": "demo-u1",
  "name": "演示企业01有限公司",
  "short": "演示01",
  "type": "意向投资企业",
  "primaryNature": "9.民营企业",
  "institution": "",
  "country": "中国",
  "category": "内资企业",
  "industry": "新一代信息技术产业",
  "lines": [101],
  "worlds": {},
  "natures": [],
  "rankIssues": [],
  "hongkongCapital": false
}
```

`id` 用于去重与关联，不能直接用清洗后的展示名称代替。名称相同的不同独立参会主体，是否合并必须由上游规则处理。`worlds`、`natures`、`rankIssues` 用于兼容上游处理结果；第一版未提供其完整编辑界面。

## 嘉宾记录

```json
{
  "id": "demo-g1",
  "unitId": "demo-u1",
  "name": "演示嘉宾01",
  "title": "董事长",
  "short": "演示01",
  "nationality": "中国",
  "status": "是",
  "owners": ["龙岗区", "市投资促进局"],
  "lines": [101],
  "priority": true,
  "senior": true
}
```

- `unitId` 必须引用存在的单位。
- `status` 限定为 `是`、`否`、`待定`、`空白`；空字符串应在上游标准化为 `空白`。
- `owners` 必须使用与 `departments[].label` 一致的责任单位名称。
- 同一嘉宾已合并的全部邀请来源放在 `owners`；前端不会识别“张三”和另一行“张三”是否同一人。
- 人选待定名额也需要稳定id，不能通过字符串“待定”把所有名额合并。
- `priority`、`senior` 是预核定标签；修改职务不会重新生成标签。
- `lines` 仅为行号。当前数据模型没有把文件id、工作表、批次id和行号组合为完整来源键，后续应补齐。

## baseline

```json
{
  "date": "2026-11-18 17:57（虚构演示）",
  "ruleDate": "2026-11-19（演示规则）",
  "units": 24,
  "guests": 36,
  "priority": 6,
  "senior": 15,
  "mode": "demo"
}
```

四个人数值应与“是”状态过滤后的数据一致。替换快照后，运行 `npm test` 检查，不要只改首页数字。

## 本机草稿

浏览器键：`sz-investment-workbench-v1`。

结构含 `edits`、`reviewed`、`log`。`edits` 以嘉宾id为键，保存姓名、职务、国籍、状态及备注。加载时覆盖内存对象，不修改服务器快照。草稿没有用户认证、签名、服务端版本或并发控制；请不要将其描述为正式审计记录。第一版可以导出JSON，但没有导回草稿的界面。

更新快照前应导出草稿，并确认稳定id没有变化。当前存储键未按批次隔离，新批次直接复用旧id可能导致旧草稿误套用；该限制必须在正式批次功能中解决。


## v0.2本机处理扩展

Processing.create(config).parseSheets(sheets,base,selectedIndices)识别22列并保留sheet/line/section；fromRecords(records,base,{fileName,date,aliases})输出units、guests、departments、districts、rules、baseline以及rawRecords、customAliases、processing。processing含rawRows、validRows、excluded、mergedRows、warnings和processedAt。guest新增sources、sourceEntities、sourceTitles、processingIssues、rankClaim和priorityTier/Reasons；unit新增canonicalKey、sourceEntities、worlds、private、rankIssues和processingIssues。screen(data)重算标签与baseline。

JSON备份format为investment-workspace-v2，包含data/baseGuests/edits/log/reviewed。IndexedDB数据库sz-investment-local-batches-v2存workspace/active。备份仅供本应用恢复，不是Excel导入格式。独立原始数据必须在处理后显式应用；状态是/否冲突转待定。旧版接口约定中“导入仅预览”由此替代。


## v0.3重点筛选

senior保留原关键词口径。guest新增priorityCandidate、priorityDecision、priorityScope、priorityRoleReasons、priorityRuleVersion及priorityReview。priorityReview含decision、scope、current、note、title、unitSignature、time；职务或单位签名变化使核实失效。baseline新增priorityCandidates和priorityRuleDate。priorityRuleText同步至批次rules。原五字段重点名单不变，候选及依据另导出。
