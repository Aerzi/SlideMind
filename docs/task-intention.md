# 【Cursor可直接执行】概念化章节大纲骨架 专项模型任务书
> 核心修正：彻底摒弃纯技术化节点定义，**大纲骨架=用户可直接感知/确认的、和最终PPT目录完全一致的层级化章节大纲（匹配你截图的PRD目录形式）+ 每个章节绑定的「模型召回执行规则」**
> 核心目标：让用户看到的是符合业务认知的概念化章节，同时让模型精准知道「每个章节该从文档里召回什么内容、按什么规则召回」，100%对齐PRD“前置大纲骨架、保证召回符合预期”的核心设计

---

## 一、核心定义对齐（彻底解决认知偏差）
```typescript
// 不可修改的核心定义，100%匹配你的需求与PRD原文
export const OutlineCoreDefinition = {
  // 你要的「概念化章节大纲骨架」官方定义
  conceptOutlineSkeleton: {
    essence: "与最终PPT目录完全一致的、层级化的业务章节框架，是用户意图的可视化落地，也是模型内容召回的唯一业务锚点",
    form: "完全匹配你截图的PRD目录形式，采用「一级大纲→二级大纲→三级大纲」的层级结构，纯业务化表述，无技术化字段",
    example: "和你截图的结构完全一致：\n一、背景目标\n  1.1 现状痛点\n  1.2 目标用户与场景\n  1.3 需求目标\n二、需求分析\n  2.1 用户场景\n  2.2 处理链路",
  },
  // 大纲与召回的核心绑定关系（解决“模型如何按需召回”的核心问题）
  outlineAndRetrievalBindRule: "每个概念化章节节点，必须绑定1套给模型的「召回执行规则」，用户只看章节标题，模型只按对应规则召回内容，实现「一个章节、一个召回指令、一份精准内容」",
  // PRD原文对齐
  prdAlign: "多文档场景必须前置构建明确的故事线/大纲骨架，来保证后续的召回与填充符合预期，彻底解决多文档内容堆砌、逻辑断层、召回无方向的核心痛点",
  // 与之前技术化节点的核心区别
  difference: {
    before: "纯技术字段定义，用户无法理解、无法确认，和最终PPT目录脱节",
    now: "用户看到的就是最终PPT的目录，可直接修改、确认，同时背后绑定模型可执行的召回规则，兼顾可读性与执行性",
  },
}
```

---

## 二、核心数据模型（层级化、业务化，兼顾用户可读+模型召回）
### 2.1 基础依赖模型（上游输入，不可修改）
```typescript
// 优先级枚举
export enum Priority {
  P0 = "P0",
  P1 = "P1",
  P2 = "P2",
}

// 大纲生成模式枚举（1:1对应PRD需求场景）
export enum OutlineGenerateMode {
  STRONG_INTENT = "STRONG_INTENT", // P0 强意图定向生成
  WEAK_INTENT = "WEAK_INTENT",     // P0 弱意图框架生成
  MAIN_DOC_INHERIT = "MAIN_DOC_INHERIT", // P0 指定主干文档继承（多文档独有）
  CUSTOM_STRUCTURE_FIXED = "CUSTOM_STRUCTURE_FIXED", // P1 定制化固定结构
  EQUAL_DOCS_MERGE = "EQUAL_DOCS_MERGE", // P1 多文档平等融合重构
}

// 标准化意图模型（意图澄清环节的最终输出，大纲生成的唯一输入）
export interface ConfirmedIntentModel {
  // P0 核心必填（已通过意图澄清锁定）
  theme: string;
  usageScene: string;
  targetAudience: string;
  // P1 结构约束
  fixedChapters?: string[]; // 用户指定的固定一级章节
  mainDocId?: string; // 指定的主干文档ID
  isEqualMerge?: boolean; // 多文档平等融合
  // P2 可选约束
  pageCountRange?: [number, number];
}

// 文档模型（上游上传的素材，召回的数据源）
export interface DocumentItem {
  docId: string;
  docName: string;
  docContent: string;
  coreTags: string[]; // 文档核心标签，用于匹配章节召回
  isMainDoc?: boolean;
  isExcluded?: boolean;
}
```

### 2.2 核心：概念化大纲章节节点模型（你要的核心载体）
```typescript
// 大纲层级枚举
export enum OutlineLevel {
  LEVEL_1 = "LEVEL_1", // 一级大纲：如「一、背景目标」
  LEVEL_2 = "LEVEL_2", // 二级大纲：如「1.1 现状痛点」
  LEVEL_3 = "LEVEL_3", // 三级大纲：如「1.1.1 用户核心痛点」
}

// 单个大纲章节节点模型（用户看到的是前5个字段，模型执行的是retrievalRule）
export interface OutlineChapterNode {
  // 【用户可见】概念化章节核心信息（和你截图的PRD目录完全一致）
  level: OutlineLevel; // 章节层级
  chapterNumber: string; // 章节编号：如「一、」「1.1」「1.1.1」
  chapterTitle: string; // 章节标题：如「背景目标」「现状痛点」
  chapterDesc: string; // 章节描述：给用户看的，这个章节要讲什么
  order: number; // 全局排序，决定PPT页面顺序
  parentChapterId?: string; // 父章节ID，用于层级绑定
  chapterId: string; // 唯一标识，仅用于系统绑定，用户不可见

  // 【模型执行用】召回执行规则（核心！告诉模型这个章节该怎么召回内容）
  retrievalRule: {
    // 核心召回指令（用自然语言告诉模型要找什么，和章节标题强绑定）
    coreCommand: string;
    // 召回范围：优先找哪些文档，排除哪些文档
    scope: {
      priorityDocIds: string[];
      excludedDocIds: string[];
    };
    // 内容权重规则
    weightRule: "mainDocFirst" | "allDocsEqual" | "customPriority";
    // 禁止规则（PRD无幻觉要求）
    forbiddenRule: string[];
    // 必须包含的核心关键词
    mustIncludeKeywords: string[];
  };
}

// 完整的大纲骨架模型（全链路核心输出）
export interface ConceptOutlineSkeleton {
  skeletonId: string;
  generateMode: OutlineGenerateMode;
  sourceIntent: ConfirmedIntentModel; // 绑定的意图模型
  sourceDocList: DocumentItem[]; // 绑定的源文档
  // 核心：层级化章节列表（用户看到的PPT完整目录）
  chapterList: OutlineChapterNode[];
  // 全局信息
  totalChapterCount: number; // 总章节数（对应PPT总页数）
  storyLine: string; // 全局故事线描述（如「总-分-总 汇报逻辑」）
  // 状态
  isUserConfirmed: boolean; // 用户是否确认，确认后锁定章节结构
  isValid: boolean;
}
```

---

## 三、全链路流程状态机（意图→大纲→召回→填充 全闭环）
```typescript
// 链路状态枚举
export enum CoreLinkStatus {
  INTENT_CONFIRMED = "INTENT_CONFIRMED", // 起点：意图澄清完成
  OUTLINE_GENERATING = "OUTLINE_GENERATING", // 生成概念化章节大纲
  OUTLINE_VALIDATING = "OUTLINE_VALIDATING", // 大纲合规校验
  OUTLINE_PENDING_CONFIRM = "OUTLINE_PENDING_CONFIRM", // 待用户确认（展示完整目录）
  OUTLINE_CONFIRMED = "OUTLINE_CONFIRMED", // 用户确认，锁定大纲
  RETRIEVAL_EXECUTING = "RETRIEVAL_EXECUTING", // 按大纲章节的召回规则执行内容召回
  RETRIEVAL_COMPLETE = "RETRIEVAL_COMPLETE", // 终点：召回完成，内容与章节1:1绑定
  ERROR = "ERROR",
}

// 全链路状态机（每个节点明确大纲的角色与流转）
export const CoreLinkStateMachine = {
  initialState: CoreLinkStatus.INTENT_CONFIRMED,
  states: {
    [CoreLinkStatus.INTENT_CONFIRMED]: {
      on: { GENERATE_OUTLINE: CoreLinkStatus.OUTLINE_GENERATING },
      input: ["ConfirmedIntentModel", "DocumentItem[]"],
      coreAction: "冻结意图与文档列表，作为大纲生成的唯一输入，禁止中途修改",
    },
    [CoreLinkStatus.OUTLINE_GENERATING]: {
      on: { GENERATE_DONE: CoreLinkStatus.OUTLINE_VALIDATING },
      input: ["ConfirmedIntentModel", "DocumentItem[]"],
      output: ["ConceptOutlineSkeleton（未校验）"],
      coreAction: "根据匹配的生成模式，生成层级化的概念化章节大纲，同时为每个章节绑定对应的召回执行规则",
      executeEntry: "OutlineGenerateRuleEngine[mode].execute",
    },
    [CoreLinkStatus.OUTLINE_VALIDATING]: {
      on: {
        VALID_PASS: CoreLinkStatus.OUTLINE_PENDING_CONFIRM,
        VALID_FAIL: CoreLinkStatus.ERROR,
      },
      input: ["ConceptOutlineSkeleton"],
      coreAction: "校验大纲与意图的匹配度、每个章节召回规则的完整性，确保符合PRD要求",
      validatorEntry: "OutlineValidationRuleEngine",
    },
    [CoreLinkStatus.OUTLINE_PENDING_CONFIRM]: {
      on: {
        USER_CONFIRM: CoreLinkStatus.OUTLINE_CONFIRMED,
        USER_EDIT: CoreLinkStatus.OUTLINE_GENERATING,
        USER_REGENERATE: CoreLinkStatus.OUTLINE_GENERATING,
      },
      input: ["ConceptOutlineSkeleton（校验通过）"],
      coreAction: "向用户展示完整的、层级化的PPT目录（仅展示用户可见的章节信息，隐藏召回规则），支持用户修改章节标题、顺序、层级，修改后自动更新对应章节的召回规则",
    },
    [CoreLinkStatus.OUTLINE_CONFIRMED]: {
      on: { EXECUTE_RETRIEVAL: CoreLinkStatus.RETRIEVAL_EXECUTING },
      input: ["ConceptOutlineSkeleton（已锁定）"],
      coreAction: "冻结大纲的章节结构、层级、排序、召回规则，后续仅可读取，不可修改，彻底保证召回与大纲的一致性",
    },
    [CoreLinkStatus.RETRIEVAL_EXECUTING]: {
      on: { RETRIEVAL_DONE: CoreLinkStatus.RETRIEVAL_COMPLETE },
      input: ["ConceptOutlineSkeleton（已锁定）"],
      output: ["章节与内容1:1绑定的召回结果包"],
      coreAction: "遍历大纲的每个章节节点，严格按照该节点绑定的召回执行规则，从对应文档中召回内容，每个章节的内容完全独立，禁止跨章节错位",
    },
    [CoreLinkStatus.RETRIEVAL_COMPLETE]: {
      on: { RESET: CoreLinkStatus.INTENT_CONFIRMED },
      coreAction: "完成全链路闭环，输出「章节大纲+对应召回内容」的完整包，传递给下游PPT生成环节",
    },
  },
};
```

---

## 四、大纲生成规则引擎（5大场景，1:1对齐PRD需求）
> 每个场景明确：怎么生成和你截图一致的层级化大纲，怎么为每个章节绑定召回规则，让模型知道如何按需召回
```typescript
export const OutlineGenerateRuleEngine = {
  // 【P0】强意图定向生成场景（匹配你截图的PRD式大纲）
  [OutlineGenerateMode.STRONG_INTENT]: {
    priority: Priority.P0,
    prdAlign: "【P0】强意图定向生成",
    // 层级化大纲生成逻辑（和你截图的PRD目录结构完全一致）
    outlineBuildLogic: [
      "步骤1：从意图中提取usageScene，匹配对应的标准层级化大纲模板（如汇报、答辩、教学模板）",
      "步骤2：根据theme、targetAudience，生成一级大纲标题，再拆解对应的二级/三级大纲",
      "步骤3：为每个层级的章节，绑定与标题强匹配的召回执行规则",
      "步骤4：输出完整的层级化大纲，和最终PPT目录完全一致",
    ],
    // 标准场景模板（和你截图的PRD结构完全对齐）
    sceneTemplateMap: {
      // 向上汇报模板（完全匹配你截图的PRD目录层级）
      "向上汇报": {
        storyLine: "总-分-总 汇报逻辑",
        defaultChapterStructure: [
          {
            level: OutlineLevel.LEVEL_1,
            chapterNumber: "一、",
            chapterTitle: "背景目标",
            chapterDesc: "项目背景、现状与核心目标",
            children: [
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "1.1",
                chapterTitle: "现状痛点",
                chapterDesc: "当前业务现状与核心痛点",
              },
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "1.2",
                chapterTitle: "目标用户与场景",
                chapterDesc: "需求覆盖的用户群体与核心场景",
              },
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "1.3",
                chapterTitle: "需求目标",
                chapterDesc: "本次需求的核心目标与预期成果",
              },
            ],
          },
          {
            level: OutlineLevel.LEVEL_1,
            chapterNumber: "二、",
            chapterTitle: "需求分析",
            chapterDesc: "用户场景、处理链路与产品预期",
            children: [
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "2.1",
                chapterTitle: "用户场景",
                chapterDesc: "核心用户场景与用户心流分析",
              },
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "2.2",
                chapterTitle: "处理链路",
                chapterDesc: "需求全链路处理流程",
              },
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "2.3",
                chapterTitle: "产品预期",
                chapterDesc: "产品核心预期与关键指标",
                children: [
                  {
                    level: OutlineLevel.LEVEL_3,
                    chapterNumber: "2.3.1",
                    chapterTitle: "意图澄清",
                    chapterDesc: "意图澄清核心维度与预期",
                  },
                  {
                    level: OutlineLevel.LEVEL_3,
                    chapterNumber: "2.3.2",
                    chapterTitle: "大纲生成",
                    chapterDesc: "大纲生成核心规则与预期",
                  },
                ],
              },
            ],
          },
          {
            level: OutlineLevel.LEVEL_1,
            chapterNumber: "三、",
            chapterTitle: "需求详情",
            chapterDesc: "核心需求点与优先级",
            children: [
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "3.1",
                chapterTitle: "关键帧",
                chapterDesc: "产品核心流程关键节点",
              },
              {
                level: OutlineLevel.LEVEL_2,
                chapterNumber: "3.2",
                chapterTitle: "需求优先级",
                chapterDesc: "需求分级与优先级定义",
              },
            ],
          },
          {
            level: OutlineLevel.LEVEL_1,
            chapterNumber: "四、",
            chapterTitle: "附录",
            chapterDesc: "相关记录与补充说明",
          },
        ],
      },
      "论文答辩": {
        storyLine: "研究背景→研究内容→成果→展望",
        defaultChapterStructure: [
          { level: OutlineLevel.LEVEL_1, chapterNumber: "一、", chapterTitle: "绪论", chapterDesc: "研究背景与意义", children: [
            { level: OutlineLevel.LEVEL_2, chapterNumber: "1.1", chapterTitle: "研究背景与选题意义", chapterDesc: "" },
            { level: OutlineLevel.LEVEL_2, chapterNumber: "1.2", chapterTitle: "国内外研究现状", chapterDesc: "" },
          ]},
          { level: OutlineLevel.LEVEL_1, chapterNumber: "二、", chapterTitle: "需求分析与系统设计", chapterDesc: "", children: [
            { level: OutlineLevel.LEVEL_2, chapterNumber: "2.1", chapterTitle: "核心需求分析", chapterDesc: "" },
            { level: OutlineLevel.LEVEL_2, chapterNumber: "2.2", chapterTitle: "系统整体架构设计", chapterDesc: "" },
          ]},
        ],
      },
    },
    // 【核心】章节与召回规则的绑定逻辑（告诉模型怎么按需召回）
    retrievalRuleBindLogic: "每个章节的召回核心指令 = 章节标题 + 章节描述 + 核心主题，召回范围为全量文档，禁止编造无来源内容，必须包含主题核心关键词",
    // 执行函数
    execute: (intent: ConfirmedIntentModel, docs: DocumentItem[]): ConceptOutlineSkeleton => {
      const template = this.sceneTemplateMap[intent.usageScene] || this.sceneTemplateMap["向上汇报"];
      // 扁平化生成章节列表，绑定父子关系与召回规则
      const chapterList: OutlineChapterNode[] = [];
      let globalOrder = 1;
      // 遍历模板生成一级章节
      template.defaultChapterStructure.forEach((level1Item, level1Index) => {
        const level1Id = `chapter-${level1Index + 1}`;
        // 生成一级章节
        chapterList.push({
          level: level1Item.level,
          chapterNumber: level1Item.chapterNumber,
          chapterTitle: level1Item.chapterTitle,
          chapterDesc: level1Item.chapterDesc,
          order: globalOrder++,
          chapterId: level1Id,
          retrievalRule: {
            coreCommand: `从所有上传文档中，提取与【${intent.theme}】的【${level1Item.chapterTitle}】相关的整体概述、核心信息，内容必须完全来自上传文档`,
            scope: { priorityDocIds: docs.map(d => d.docId), excludedDocIds: docs.filter(d => d.isExcluded).map(d => d.docId) },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造无来源内容", "禁止超出章节主题范围"],
            mustIncludeKeywords: intent.theme.split(" "),
          },
        });
        // 生成二级章节
        level1Item.children?.forEach((level2Item, level2Index) => {
          const level2Id = `chapter-${level1Index + 1}-${level2Index + 1}`;
          chapterList.push({
            level: level2Item.level,
            chapterNumber: level2Item.chapterNumber,
            chapterTitle: level2Item.chapterTitle,
            chapterDesc: level2Item.chapterDesc,
            order: globalOrder++,
            parentChapterId: level1Id,
            chapterId: level2Id,
            retrievalRule: {
              coreCommand: `从所有上传文档中，提取与【${intent.theme}】的【${level1Item.chapterTitle}】-【${level2Item.chapterTitle}】相关的全部详细内容，内容必须完全来自上传文档，禁止编造`,
              scope: { priorityDocIds: docs.map(d => d.docId), excludedDocIds: docs.filter(d => d.isExcluded).map(d => d.docId) },
              weightRule: "allDocsEqual",
              forbiddenRule: ["禁止编造无来源内容", "禁止超出章节主题范围"],
              mustIncludeKeywords: [intent.theme, level2Item.chapterTitle],
            },
          });
          // 生成三级章节
          level2Item.children?.forEach((level3Item, level3Index) => {
            const level3Id = `chapter-${level1Index + 1}-${level2Index + 1}-${level3Index + 1}`;
            chapterList.push({
              level: level3Item.level,
              chapterNumber: level3Item.chapterNumber,
              chapterTitle: level3Item.chapterTitle,
              chapterDesc: level3Item.chapterDesc,
              order: globalOrder++,
              parentChapterId: level2Id,
              chapterId: level3Id,
              retrievalRule: {
                coreCommand: `从所有上传文档中，提取与【${intent.theme}】的【${level2Item.chapterTitle}】-【${level3Item.chapterTitle}】相关的详细内容，内容必须完全来自上传文档`,
                scope: { priorityDocIds: docs.map(d => d.docId), excludedDocIds: docs.filter(d => d.isExcluded).map(d => d.docId) },
                weightRule: "allDocsEqual",
                forbiddenRule: ["禁止编造无来源内容"],
                mustIncludeKeywords: [level3Item.chapterTitle],
              },
            });
          });
        });
      });
      return {
        skeletonId: `skeleton-${Date.now()}`,
        generateMode: OutlineGenerateMode.STRONG_INTENT,
        sourceIntent: intent,
        sourceDocList: docs,
        chapterList,
        totalChapterCount: chapterList.length,
        storyLine: template.storyLine,
        isUserConfirmed: false,
        isValid: true,
      };
    },
  },
  // 【P0】指定主干文档继承场景（多文档独有）
  [OutlineGenerateMode.MAIN_DOC_INHERIT]: {
    priority: Priority.P0,
    prdAlign: "【P0】指定主干文档生成",
    outlineBuildLogic: [
      "步骤1：100%复用主干文档的原生章节结构，生成层级化大纲，禁止修改核心章节顺序与标题",
      "步骤2：为每个章节绑定召回规则，优先从主干文档召回内容，其他文档仅做补充",
      "步骤3：输出完整大纲，完全匹配主干文档的叙事逻辑",
    ],
    retrievalRuleBindLogic: "每个章节的核心召回指令优先匹配主干文档的对应章节内容，其他文档仅作为补充素材，禁止修改主干章节的核心内容",
  },
  // 【P0】弱意图框架生成场景
  [OutlineGenerateMode.WEAK_INTENT]: {
    priority: Priority.P0,
    prdAlign: "【P0】弱意图框架生成",
    outlineBuildLogic: [
      "步骤1：从全量文档中提取核心主题与高频关键词，确定PPT核心主题",
      "步骤2：生成极简的层级化大纲框架，匹配文档内容类型",
      "步骤3：为每个章节绑定通用召回规则，覆盖全文档内容",
    ],
  },
  // 【P1】定制化固定结构场景
  [OutlineGenerateMode.CUSTOM_STRUCTURE_FIXED]: {
    priority: Priority.P1,
    prdAlign: "【P1】定制化结构填充",
    outlineBuildLogic: [
      "步骤1：100%复用用户指定的固定章节，生成层级化大纲，禁止修改章节顺序、标题",
      "步骤2：为每个固定章节绑定精准的召回规则，严格匹配章节主题",
    ],
  },
  // 【P1】多文档平等融合场景
  [OutlineGenerateMode.EQUAL_DOCS_MERGE]: {
    priority: Priority.P1,
    prdAlign: "【P1】多文档融合生成",
    outlineBuildLogic: [
      "步骤1：提炼所有文档的共性核心、互补内容，搭建全新的层级化大纲",
      "步骤2：为每个章节绑定全文档平等召回规则，覆盖所有文档的对应内容",
    ],
  },
};
```

---

## 五、大纲强制校验规则引擎
```typescript
export const OutlineValidationRuleEngine = [
  {
    ruleName: "意图匹配校验",
    priority: Priority.P0,
    validator: (skeleton: ConceptOutlineSkeleton): boolean => {
      return skeleton.chapterList.every(chapter => 
        chapter.chapterTitle.includes(skeleton.sourceIntent.theme) || 
        chapter.retrievalRule.mustIncludeKeywords.includes(skeleton.sourceIntent.theme)
      );
    },
    errorMessage: "大纲章节与用户核心主题不匹配",
  },
  {
    ruleName: "召回规则完整性校验",
    priority: Priority.P0,
    validator: (skeleton: ConceptOutlineSkeleton): boolean => {
      return skeleton.chapterList.every(chapter => 
        chapter.retrievalRule.coreCommand && 
        chapter.retrievalRule.scope.priorityDocIds.length > 0
      );
    },
    errorMessage: "存在章节缺失召回执行规则，无法驱动模型召回内容",
  },
  {
    ruleName: "层级结构合规校验",
    priority: Priority.P1,
    validator: (skeleton: ConceptOutlineSkeleton): boolean => {
      const level2Chapters = skeleton.chapterList.filter(c => c.level === OutlineLevel.LEVEL_2);
      return level2Chapters.every(c => c.parentChapterId && skeleton.chapterList.some(p => p.chapterId === c.parentChapterId));
    },
    errorMessage: "大纲层级结构混乱，二级章节无对应父级一级章节",
  },
];
```

---

## 六、标准化Mock数据集（5套，完全匹配你的需求）
> 每套数据都包含：意图输入→和你截图一致的层级化大纲→每个章节绑定的召回规则→预期召回结果，可直接闭环模拟
```typescript
export const OutlineMockDataSets = [
  // Mock-001 强意图PRD汇报场景（和你截图的结构完全一致）
  {
    mockId: "MOCK-OUTLINE-001",
    mockName: "PRD需求汇报场景Mock",
    generateMode: OutlineGenerateMode.STRONG_INTENT,
    // 输入：意图澄清后的标准化模型
    input: {
      confirmedIntent: {
        theme: "私有文档生成全文PPT 需求汇报",
        usageScene: "向上汇报",
        targetAudience: "产品负责人与研发团队",
      },
      docList: [
        {
          docId: "DOC-001",
          docName: "私有文档生成PPT PRD文档",
          docContent: "现状痛点：当前AIPPT仅支持单文档生成，无法处理多份私有文档整合，用户生成的PPT内容片面、逻辑断层；目标用户：企业职员、老师、学生；核心场景：上传多篇文档生成汇报PPT；需求目标：实现多文档私有知识检索、分析、整合，生成无幻觉、强逻辑的全文PPT",
          coreTags: ["现状痛点", "目标用户", "需求目标", "多文档生成"],
        },
        {
          docId: "DOC-002",
          docName: "需求分析文档",
          docContent: "用户场景：用户输入一句话意图+多篇文档，需要前置构建大纲骨架，再召回内容；处理链路：用户输入→主Agent→意图澄清→大纲生成→RAG召回→PPT生成；产品预期：意图澄清覆盖主题、场景、受众核心维度，大纲生成符合汇报逻辑",
          coreTags: ["用户场景", "处理链路", "产品预期", "意图澄清", "大纲生成"],
        },
        {
          docId: "DOC-003",
          docName: "需求详情文档",
          docContent: "核心需求分为P0/P1/P2三个优先级，关键帧包括输入、意图澄清、大纲确认、内容生成、PPT输出；需求优先级：强意图生成、主干文档生成为P0，定制化结构为P1",
          coreTags: ["需求详情", "关键帧", "需求优先级"],
        },
      ],
    },
    // 核心输出：和你截图完全一致的层级化大纲骨架
    outputOutlineSkeleton: {
      skeletonId: "MOCK-SKELETON-001",
      generateMode: OutlineGenerateMode.STRONG_INTENT,
      storyLine: "总-分-总 汇报逻辑",
      totalChapterCount: 12,
      // 用户可见的章节列表（和你截图的PRD目录完全一致）
      chapterList: [
        {
          level: OutlineLevel.LEVEL_1,
          chapterNumber: "一、",
          chapterTitle: "背景目标",
          chapterDesc: "项目背景、现状与核心目标",
          order: 1,
          chapterId: "chapter-1",
          // 给模型的召回规则
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT 需求汇报】的背景目标相关整体概述，内容必须完全来自上传文档",
            scope: { priorityDocIds: ["DOC-001", "DOC-002", "DOC-003"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造无来源内容", "禁止超出主题范围"],
            mustIncludeKeywords: ["私有文档生成全文PPT", "背景目标"],
          },
        },
        {
          level: OutlineLevel.LEVEL_2,
          chapterNumber: "1.1",
          chapterTitle: "现状痛点",
          chapterDesc: "当前产品现状与用户核心痛点",
          order: 2,
          parentChapterId: "chapter-1",
          chapterId: "chapter-1-1",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的现状痛点、现有能力不足的全部详细内容，必须完全来自上传文档",
            scope: { priorityDocIds: ["DOC-001"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["现状痛点", "多文档生成"],
          },
        },
        {
          level: OutlineLevel.LEVEL_2,
          chapterNumber: "1.2",
          chapterTitle: "目标用户与场景",
          chapterDesc: "需求覆盖的用户群体与核心使用场景",
          order: 3,
          parentChapterId: "chapter-1",
          chapterId: "chapter-1-2",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的目标用户群体、核心使用场景的详细内容",
            scope: { priorityDocIds: ["DOC-001"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["目标用户", "使用场景"],
          },
        },
        {
          level: OutlineLevel.LEVEL_2,
          chapterNumber: "1.3",
          chapterTitle: "需求目标",
          chapterDesc: "本次需求的核心目标与预期成果",
          order: 4,
          parentChapterId: "chapter-1",
          chapterId: "chapter-1-3",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的需求核心目标、预期成果的详细内容",
            scope: { priorityDocIds: ["DOC-001"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["需求目标", "无幻觉", "强逻辑"],
          },
        },
        {
          level: OutlineLevel.LEVEL_1,
          chapterNumber: "二、",
          chapterTitle: "需求分析",
          chapterDesc: "用户场景、处理链路与产品预期",
          order: 5,
          chapterId: "chapter-2",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的需求分析整体概述",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["需求分析", "用户场景", "处理链路"],
          },
        },
        {
          level: OutlineLevel.LEVEL_2,
          chapterNumber: "2.1",
          chapterTitle: "用户场景",
          chapterDesc: "核心用户场景与用户心流分析",
          order: 6,
          parentChapterId: "chapter-2",
          chapterId: "chapter-2-1",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的用户场景、用户心流的详细内容",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["用户场景", "多文档输入"],
          },
        },
        {
          level: OutlineLevel.LEVEL_2,
          chapterNumber: "2.2",
          chapterTitle: "处理链路",
          chapterDesc: "需求全链路处理流程",
          order: 7,
          parentChapterId: "chapter-2",
          chapterId: "chapter-2-2",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的全链路处理流程的详细内容",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["处理链路", "主Agent", "RAG召回"],
          },
        },
        {
          level: OutlineLevel.LEVEL_2,
          chapterNumber: "2.3",
          chapterTitle: "产品预期",
          chapterDesc: "产品核心预期与关键指标",
          order: 8,
          parentChapterId: "chapter-2",
          chapterId: "chapter-2-3",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的产品核心预期的详细内容",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["产品预期", "意图澄清", "大纲生成"],
          },
        },
        {
          level: OutlineLevel.LEVEL_3,
          chapterNumber: "2.3.1",
          chapterTitle: "意图澄清",
          chapterDesc: "意图澄清核心维度与预期",
          order: 9,
          parentChapterId: "chapter-2-3",
          chapterId: "chapter-2-3-1",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的意图澄清核心维度、预期效果的详细内容",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["意图澄清", "核心维度"],
          },
        },
        {
          level: OutlineLevel.LEVEL_3,
          chapterNumber: "2.3.2",
          chapterTitle: "大纲生成",
          chapterDesc: "大纲生成核心规则与预期",
          order: 10,
          parentChapterId: "chapter-2-3",
          chapterId: "chapter-2-3-2",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的大纲生成核心规则、预期效果的详细内容",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["大纲生成", "故事线", "骨架"],
          },
        },
        {
          level: OutlineLevel.LEVEL_1,
          chapterNumber: "三、",
          chapterTitle: "需求详情",
          chapterDesc: "核心需求点与优先级",
          order: 11,
          chapterId: "chapter-3",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的需求详情、核心需求点的整体内容",
            scope: { priorityDocIds: ["DOC-003"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["需求详情", "需求优先级"],
          },
        },
        {
          level: OutlineLevel.LEVEL_1,
          chapterNumber: "四、",
          chapterTitle: "附录",
          chapterDesc: "相关记录与补充说明",
          order: 12,
          chapterId: "chapter-4",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT】的相关补充记录、变更记录内容",
            scope: { priorityDocIds: ["DOC-001", "DOC-002", "DOC-003"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造内容"],
            mustIncludeKeywords: ["附录", "记录"],
          },
        },
      ],
    },
    // 预期召回结果（按章节1:1绑定）
    expectedRetrievalResult: [
      {
        chapterId: "chapter-1-1",
        chapterTitle: "1.1 现状痛点",
        recalledContent: "当前AIPPT仅支持单文档点对点生成，缺乏对多素材深度整合的处理能力，用户在面对多份参考资料的真实办公场景时，系统无法跨文档提取逻辑，生成的PPT内容片面、缺乏全局视角，难以满足复杂汇报需求",
        sourceDocId: "DOC-001",
      },
      {
        chapterId: "chapter-2-3-1",
        chapterTitle: "2.3.1 意图澄清",
        recalledContent: "意图澄清核心覆盖P0维度：主题、生成目标/使用场景、目标受众，从源头避免生成方向偏差，保证后续大纲生成与召回内容完全符合用户预期",
        sourceDocId: "DOC-002",
      },
    ],
  },
  // 剩余4套Mock数据（主干文档、弱意图、定制结构、融合生成）完整结构同上，仅场景与章节不同
  {
    mockId: "MOCK-OUTLINE-002",
    mockName: "毕业论文主干文档场景Mock",
    generateMode: OutlineGenerateMode.MAIN_DOC_INHERIT,
    input: {
      confirmedIntent: {
        theme: "基于RAG的多文档PPT生成系统 毕业论文答辩",
        usageScene: "论文答辩",
        targetAudience: "答辩评委",
        mainDocId: "DOC-MAIN",
      },
      docList: [
        {
          docId: "DOC-MAIN",
          docName: "毕业论文终稿",
          docContent: "论文章节：一、绪论 二、需求分析 三、系统设计 四、系统实现 五、测试验证 六、总结与展望",
          coreTags: ["RAG", "多文档PPT", "系统设计", "论文"],
          isMainDoc: true,
        },
        {
          docId: "DOC-SUPP",
          docName: "参考文献综述",
          docContent: "RAG技术原理、大模型Agent调度技术",
          coreTags: ["RAG原理", "Agent"],
        },
      ],
    },
    outputOutlineSkeleton: {
      chapterList: [
        { level: OutlineLevel.LEVEL_1, chapterNumber: "一、", chapterTitle: "绪论", order: 1, retrievalRule: { coreCommand: "优先从毕业论文终稿中提取绪论章节的全部内容，参考文献综述仅做补充", scope: { priorityDocIds: ["DOC-MAIN"], excludedDocIds: [] }, weightRule: "mainDocFirst", forbiddenRule: ["禁止修改主干文档的核心内容"], mustIncludeKeywords: ["绪论", "研究背景"] } },
      ],
    },
  },
];
```

---

## 七、Cursor最终执行要求
1. 基于以上模型生成完整React+TypeScript Demo，**100%聚焦「概念化层级大纲生成→章节绑定召回规则→按规则执行内容召回」核心链路**，所有类型、规则、模板完全复用
2. 大纲展示页面，**仅向用户展示章节编号、标题、描述、层级（和你截图的PRD目录完全一致）**，隐藏召回规则等技术字段，用户可直接编辑、新增、删除章节，编辑后自动更新对应章节的召回规则
3. 选中Mock数据集时，自动生成对应的层级化大纲，完整展示每个章节的预期召回内容，可视化呈现「大纲章节→召回规则→召回内容」的1:1绑定关系
4. 所有校验规则必须在对应节点执行，不满足规则时禁止进入下一环节
5. 样式使用极简实现，无需美化，仅保证流程可正常操作、大纲目录可清晰展示
6. 生成代码必须可直接`npm install && npm run dev`运行，无报错