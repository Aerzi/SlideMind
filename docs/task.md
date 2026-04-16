# 【Cursor可直接执行】私有多文档生成全文PPT Demo原型 标准化模型文件
> 生成指令：基于以下全结构化模型，生成可直接运行的React+TypeScript Demo原型，**仅关注逻辑实现、流程流转、规则校验**，样式使用极简默认值，100%严格对齐PRD核心需求，无AI能力时通过内置Mock数据完成全流程闭环模拟

---

## 一、全局元数据与PRD对齐规则
```typescript
// 项目元数据（不可修改，严格对齐PRD）
export const ProjectMeta = {
  projectId: "ai-private-docs-ppt-demo",
  projectName: "演示AI-私有多文档生成全文PPT Demo原型",
  prdCoreRule: {
    background: "解决单文档生成无法满足多私有文档深度整合、逻辑串联生成PPT的企业/教育/学生核心场景需求",
    mustRealizeTarget: [
      "多文档内容跨文档逻辑串联与完整故事线重构",
      "生成内容100%来自用户上传素材，无幻觉、可溯源",
      "前置意图澄清+大纲骨架构建，从源头控制生成方向",
      "支持用户对素材权重、结构规则的个性化管控"
    ],
    priorityOrder: ["P0", "P1", "P2"],
    forbiddenScope: ["图片/表格保留", "公域联网补充", "复杂数据联动计算"],
  },
  version: "1.0.0",
}
```

---

## 二、核心数据模型（TypeScript 强类型定义）
```typescript
// 核心枚举定义
export enum Priority {
  P0 = "P0",
  P1 = "P1",
  P2 = "P2",
}

// 流程分支枚举（1:1对应PRD核心需求场景）
export enum ProcessBranch {
  STRONG_INTENT = "STRONG_INTENT", // P0 强意图定向生成
  WEAK_INTENT = "WEAK_INTENT",     // P0 弱意图框架生成
  MAIN_DOC = "MAIN_DOC",           // P0 指定主干文档生成（多文档独有）
  CUSTOM_STRUCTURE = "CUSTOM_STRUCTURE", // P1 定制化结构填充
  EQUAL_MERGE = "EQUAL_MERGE",     // P1 多文档平等融合生成
}

// 流程状态机枚举（全链路节点定义）
export enum ProcessStatus {
  IDLE = "IDLE",
  INPUT_COMPLETE = "INPUT_COMPLETE",
  INTENT_CHECKING = "INTENT_CHECKING",
  INTENT_MISSING = "INTENT_MISSING",
  INTENT_CONFIRMED = "INTENT_CONFIRMED",
  OUTLINE_GENERATING = "OUTLINE_GENERATING",
  OUTLINE_CONFIRMED = "OUTLINE_CONFIRMED",
  CONTENT_RECALLING = "CONTENT_RECALLING",
  CONTENT_RANKING = "CONTENT_RANKING",
  PPT_GENERATING = "PPT_GENERATING",
  COMPLETE = "COMPLETE",
  ERROR = "ERROR",
}

// 核心实体接口
export interface DocumentItem {
  docId: string;
  docName: string;
  docContent: string;
  isMainDoc?: boolean; // 主干文档标记
  isExcluded?: boolean; // 排除文档标记
}

export interface IntentModel {
  // P0 必选核心字段（PRD强制要求）
  theme: string;
  usageScene: string;
  targetAudience: string;
  // P1 可选字段
  pageCount?: number;
  fixedChapters?: string[];
  mainDocId?: string;
  // P2 预留字段
  contentDetailLevel?: "minimal" | "standard" | "detailed";
  allowPublicInfo?: boolean;
}

export interface OutlineItem {
  chapterId: string;
  chapterTitle: string;
  chapterDesc: string;
  order: number;
}

export interface RecallContentItem {
  chapterId: string;
  content: string;
  sourceDocId: string;
  sourceDocName: string;
}

export interface PPTPageItem {
  pageId: string;
  pageTitle: string;
  pageContent: string;
  order: number;
  sourceMark: string; // 溯源标记（PRD强制要求）
}

export interface MockDataSet {
  mockId: string;
  mockName: string;
  alignPRDRequirement: string;
  targetBranch: ProcessBranch;
  priority: Priority;
  userInput: {
    instruction: string;
    docList: DocumentItem[];
  };
  triggerRule: string;
  expectedOutput: {
    intentModel: IntentModel;
    outlineList: OutlineItem[];
    pptPageCount: number;
  };
}
```

---

## 三、核心流程状态机模型（可直接执行的流转逻辑）
```typescript
// 全流程状态机（严格对齐PRD主Agent调度链路）
export const ProcessStateMachine = {
  initialState: ProcessStatus.IDLE,
  states: {
    [ProcessStatus.IDLE]: {
      on: { SUBMIT_INPUT: ProcessStatus.INPUT_COMPLETE },
      action: "初始化Demo，清空全局状态，渲染输入页面",
    },
    [ProcessStatus.INPUT_COMPLETE]: {
      on: { CHECK_INTENT: ProcessStatus.INTENT_CHECKING },
      action: "存储用户输入的指令与文档列表，触发意图校验",
    },
    [ProcessStatus.INTENT_CHECKING]: {
      on: {
        INTENT_COMPLETE: ProcessStatus.INTENT_CONFIRMED,
        INTENT_INCOMPLETE: ProcessStatus.INTENT_MISSING,
      },
      action: "校验IntentModel的P0核心字段完整性，执行分支规则匹配",
      validator: (intent: Partial<IntentModel>) => {
        return !!(intent.theme && intent.usageScene && intent.targetAudience);
      },
    },
    [ProcessStatus.INTENT_MISSING]: {
      on: { SUBMIT_INTENT_SUPPLEMENT: ProcessStatus.INTENT_CONFIRMED },
      action: "渲染意图补全表单，仅要求补充缺失的P0核心字段",
    },
    [ProcessStatus.INTENT_CONFIRMED]: {
      on: { GENERATE_OUTLINE: ProcessStatus.OUTLINE_GENERATING },
      action: "生成标准化IntentModel，匹配对应流程分支",
    },
    [ProcessStatus.OUTLINE_GENERATING]: {
      on: {
        CONFIRM_OUTLINE: ProcessStatus.OUTLINE_CONFIRMED,
        REGENERATE_OUTLINE: ProcessStatus.OUTLINE_GENERATING,
      },
      action: "根据分支规则生成大纲骨架，分支规则优先于通用逻辑",
      branchOverride: {
        [ProcessBranch.CUSTOM_STRUCTURE]: "跳过自动生成，直接使用用户指定的fixedChapters作为大纲",
        [ProcessBranch.MAIN_DOC]: "大纲100%沿用主干文档的章节结构，禁止修改核心框架",
      },
    },
    [ProcessStatus.OUTLINE_CONFIRMED]: {
      on: { RECALL_CONTENT: ProcessStatus.CONTENT_RECALLING },
      action: "锁定用户确认的大纲，不可修改",
    },
    [ProcessStatus.CONTENT_RECALLING]: {
      on: { RANK_CONTENT: ProcessStatus.CONTENT_RANKING },
      action: "按大纲与分支规则召回内容，标注来源文档",
      branchOverride: {
        [ProcessBranch.MAIN_DOC]: "优先从主干文档召回核心内容，其他文档仅做补充",
        [ProcessBranch.EQUAL_MERGE]: "所有文档权重平等，全量召回并自动去重",
        [ProcessBranch.CUSTOM_STRUCTURE]: "按固定章节精准匹配内容，不跨章节调整",
      },
    },
    [ProcessStatus.CONTENT_RANKING]: {
      on: { GENERATE_PPT: ProcessStatus.PPT_GENERATING },
      action: "内容精排、逻辑串联、去重，生成markdown原稿",
      validator: (content: RecallContentItem[], docList: DocumentItem[]) => {
        // 无幻觉强制校验（PRD核心要求）
        return content.every(item => docList.some(doc => doc.docId === item.sourceDocId));
      },
    },
    [ProcessStatus.PPT_GENERATING]: {
      on: { COMPLETE: ProcessStatus.COMPLETE },
      action: "根据markdown原稿生成PPT分页结构",
    },
    [ProcessStatus.COMPLETE]: {
      on: { RESET: ProcessStatus.IDLE },
      action: "渲染PPT预览页，提供流程回溯入口",
    },
    [ProcessStatus.ERROR]: {
      on: { RESET: ProcessStatus.IDLE },
      action: "展示错误信息，提示重置重试",
    },
  },
};
```

---

## 四、分支规则引擎模型（1:1映射PRD需求优先级）
```typescript
// 分支触发规则（可直接解析执行，无硬编码）
export const BranchRuleEngine = [
  {
    branch: ProcessBranch.STRONG_INTENT,
    priority: Priority.P0,
    triggerCondition: "用户指令完整包含theme、usageScene、targetAudience三个P0核心字段，无固定大纲、无主干文档指定",
    triggerExpression: (input: { instruction: string, docList: DocumentItem[] }, intent: Partial<IntentModel>) => {
      return intent.theme && intent.usageScene && intent.targetAudience && !intent.fixedChapters && !intent.mainDocId;
    },
    executeLogic: "直接生成标准化IntentModel，按总-分-总汇报逻辑生成大纲，全文档匹配召回内容",
  },
  {
    branch: ProcessBranch.WEAK_INTENT,
    priority: Priority.P0,
    triggerCondition: "用户指令缺失usageScene/targetAudience至少1个P0核心字段，无固定大纲、无主干文档指定",
    triggerExpression: (input: { instruction: string, docList: DocumentItem[] }, intent: Partial<IntentModel>) => {
      return !intent.usageScene || !intent.targetAudience;
    },
    executeLogic: "触发意图补全引导，补全后从全文档提炼核心主题，搭建完整故事线大纲",
  },
  {
    branch: ProcessBranch.MAIN_DOC,
    priority: Priority.P0,
    triggerCondition: "用户明确指定某篇文档为主干，要求沿用其章节结构，其他文档仅做补充",
    triggerExpression: (input: { instruction: string, docList: DocumentItem[] }, intent: Partial<IntentModel>) => {
      return !!intent.mainDocId && input.docList.some(doc => doc.docId === intent.mainDocId && doc.isMainDoc);
    },
    executeLogic: "大纲100%沿用主干文档章节结构，核心内容优先从主干召回，其他文档仅补充对应章节",
  },
  {
    branch: ProcessBranch.CUSTOM_STRUCTURE,
    priority: Priority.P1,
    triggerCondition: "用户明确指定固定大纲章节，要求严格按结构填充，不得修改框架",
    triggerExpression: (input: { instruction: string, docList: DocumentItem[] }, intent: Partial<IntentModel>) => {
      return !!intent.fixedChapters && intent.fixedChapters.length > 0;
    },
    executeLogic: "跳过大纲自动生成，直接使用用户指定的fixedChapters作为大纲，按章节精准匹配内容",
  },
  {
    branch: ProcessBranch.EQUAL_MERGE,
    priority: Priority.P1,
    triggerCondition: "用户未指定主干文档，明确要求所有文档权重平等，无固定大纲",
    triggerExpression: (input: { instruction: string, docList: DocumentItem[] }, intent: Partial<IntentModel>) => {
      return !intent.mainDocId && !intent.fixedChapters && (input.instruction.includes("所有文档权重平等") || input.instruction.includes("同等重要"));
    },
    executeLogic: "提炼全文档共性核心与递进逻辑，搭建全新全局故事线，所有文档平等召回内容，自动去重",
  },
];
```

---

## 五、标准化Mock数据集（共5套，完整覆盖所有分支场景）
> 每套数据绑定唯一触发分支，选中后自动触发对应流程，无AI能力时直接使用expectedOutput完成模拟
```typescript
export const MockDataSets: MockDataSet[] = [
  // Mock-001 强意图定向生成（P0核心场景）
  {
    mockId: "MOCK-001",
    mockName: "强意图定向生成数据集",
    alignPRDRequirement: "【P0】强意图定向生成",
    targetBranch: ProcessBranch.STRONG_INTENT,
    priority: Priority.P0,
    userInput: {
      instruction: "基于我上传的3份Q1项目复盘文档，生成一份面向部门总监的项目向上汇报PPT，核心主题是Q1产品迭代项目复盘与Q2规划，要求突出项目成果、问题复盘与后续动作",
      docList: [
        {
          docId: "DOC-001-01",
          docName: "Q1产品迭代项目整体复盘报告",
          docContent: "项目背景：2026年Q1启动产品V2.0迭代，核心目标是提升多文档生成PPT能力；核心进度：3个月完成需求开发、测试、上线；核心成果：多文档生成能力上线，用户使用率提升45%；核心问题：召回准确率待优化，用户返工率15%；后续规划：优化RAG召回能力，提升内容逻辑串联效果",
        },
        {
          docId: "DOC-001-02",
          docName: "Q1项目核心功能迭代详情",
          docContent: "核心功能1：多文档意图澄清模块，上线后生成方向偏差率下降60%；核心功能2：大纲骨架前置生成模块，用户大纲确认率提升70%；核心功能3：多文档内容召回模块，支持跨文档内容匹配；用户反馈：核心功能满足基础需求，希望优化内容逻辑串联能力",
        },
        {
          docId: "DOC-001-03",
          docName: "Q2产品迭代规划方案",
          docContent: "Q2核心目标：多文档生成能力行业领先，用户返工率降至5%以下；核心排期：4月完成RAG能力优化，5月完成逻辑串联引擎升级，6月全量上线；资源需求：新增2名算法工程师，1名前端开发；风险点：排期紧张，需优先保障核心功能落地",
        },
      ],
    },
    triggerRule: "用户指令完整包含3个P0核心字段，触发STRONG_INTENT分支",
    expectedOutput: {
      intentModel: {
        theme: "Q1产品迭代项目复盘与Q2规划",
        usageScene: "部门向上汇报",
        targetAudience: "部门总监",
      },
      outlineList: [
        { chapterId: "CH-001", chapterTitle: "封面", chapterDesc: "Q1产品迭代项目复盘与Q2规划", order: 1 },
        { chapterId: "CH-002", chapterTitle: "目录", chapterDesc: "汇报内容框架", order: 2 },
        { chapterId: "CH-003", chapterTitle: "项目整体回顾与核心成果", chapterDesc: "Q1项目背景、目标、整体进度与核心成果", order: 3 },
        { chapterId: "CH-004", chapterTitle: "核心功能迭代与落地效果", chapterDesc: "核心功能详情、上线效果与用户反馈", order: 4 },
        { chapterId: "CH-005", chapterTitle: "项目问题复盘与根因分析", chapterDesc: "核心问题、根因与改进方向", order: 5 },
        { chapterId: "CH-006", chapterTitle: "Q2迭代规划与核心目标", chapterDesc: "Q2目标、排期、资源需求与风险", order: 6 },
        { chapterId: "CH-007", chapterTitle: "总结与致谢", chapterDesc: "整体总结与致谢", order: 7 },
      ],
      pptPageCount: 8,
    },
  },
  // Mock-002 弱意图框架生成（P0核心场景）
  {
    mockId: "MOCK-002",
    mockName: "弱意图框架生成数据集",
    alignPRDRequirement: "【P0】弱意图框架生成",
    targetBranch: ProcessBranch.WEAK_INTENT,
    priority: Priority.P0,
    userInput: {
      instruction: "帮我用上传的4份文档，做一份PPT",
      docList: [
        {
          docId: "DOC-002-01",
          docName: "高中语文必修3 唐诗三首教案",
          docContent: "教学目标：掌握唐诗三首的诗词内容、创作背景、核心意象与情感表达；教学时长：2课时；教学重点：诗词解析、意象分析、情感把握；教学难点：作者创作心境的理解",
        },
        {
          docId: "DOC-002-02",
          docName: "唐诗三首 知识点梳理",
          docContent: "核心知识点1：作者生平与创作背景；核心知识点2：诗词原文与注释；核心知识点3：核心意象解析；核心知识点4：情感表达与艺术手法",
        },
        {
          docId: "DOC-002-03",
          docName: "唐诗三首 课堂练习题",
          docContent: "基础题：诗词原文填空；提升题：意象分析与情感理解；拓展题：同类诗词对比阅读",
        },
        {
          docId: "DOC-002-04",
          docName: "唐诗三首 作者生平与创作背景",
          docContent: "作者生平、所处时代背景、创作该诗词的人生阶段与心境、诗词的创作背景",
        },
      ],
    },
    triggerRule: "用户指令缺失usageScene、targetAudience两个P0核心字段，触发WEAK_INTENT分支",
    expectedOutput: {
      intentModel: {
        theme: "唐诗三首 课堂教学",
        usageScene: "高中课堂教学",
        targetAudience: "高一学生",
      },
      outlineList: [
        { chapterId: "CH-001", chapterTitle: "封面", chapterDesc: "唐诗三首 课堂教学", order: 1 },
        { chapterId: "CH-002", chapterTitle: "作者生平与创作背景", chapterDesc: "作者介绍、诗词创作背景", order: 2 },
        { chapterId: "CH-003", chapterTitle: "诗词原文与注释", chapterDesc: "诗词原文、重点字词注释", order: 3 },
        { chapterId: "CH-004", chapterTitle: "核心意象与艺术手法", chapterDesc: "诗词核心意象解析、艺术手法讲解", order: 4 },
        { chapterId: "CH-005", chapterTitle: "情感表达与主旨解读", chapterDesc: "诗词情感与核心主旨讲解", order: 5 },
        { chapterId: "CH-006", chapterTitle: "课堂练习与巩固", chapterDesc: "课堂练习题讲解与巩固", order: 6 },
        { chapterId: "CH-007", chapterTitle: "课堂总结与拓展", chapterDesc: "内容总结与拓展阅读", order: 7 },
      ],
      pptPageCount: 8,
    },
  },
  // Mock-003 指定主干文档生成（P0多文档独有场景）
  {
    mockId: "MOCK-003",
    mockName: "指定主干文档生成数据集",
    alignPRDRequirement: "【P0】指定主干文档生成",
    targetBranch: ProcessBranch.MAIN_DOC,
    priority: Priority.P0,
    userInput: {
      instruction: "以我上传的《2026届毕业论文终稿》为主干文档，另外2份参考文献综述与调研数据报告作为补充，生成一份毕业论文答辩PPT，要求完全沿用论文的章节结构，不改动核心逻辑",
      docList: [
        {
          docId: "DOC-003-01",
          docName: "2026届计算机专业毕业论文终稿",
          docContent: "论文章节：1. 绪论 2. 需求分析 3. 系统设计 4. 系统实现 5. 测试验证 6. 总结与展望；核心内容：基于RAG的多文档PPT生成系统设计与实现",
          isMainDoc: true,
        },
        {
          docId: "DOC-003-02",
          docName: "相关技术与参考文献综述",
          docContent: "RAG技术原理、大语言模型Agent调度技术、AIPPT行业现状、相关参考文献梳理",
        },
        {
          docId: "DOC-003-03",
          docName: "系统测试调研数据报告",
          docContent: "系统功能测试数据、性能测试数据、用户体验调研数据、测试结论",
        },
      ],
    },
    triggerRule: "用户明确指定主干文档，要求沿用其章节结构，触发MAIN_DOC分支",
    expectedOutput: {
      intentModel: {
        theme: "基于RAG的多文档PPT生成系统设计与实现 毕业论文答辩",
        usageScene: "毕业论文答辩",
        targetAudience: "答辩评委老师",
        mainDocId: "DOC-003-01",
      },
      outlineList: [
        { chapterId: "CH-001", chapterTitle: "封面", chapterDesc: "毕业论文答辩PPT", order: 1 },
        { chapterId: "CH-002", chapterTitle: "绪论", chapterDesc: "研究背景、意义、目标与内容", order: 2 },
        { chapterId: "CH-003", chapterTitle: "需求分析", chapterDesc: "系统需求、功能需求、非功能需求", order: 3 },
        { chapterId: "CH-004", chapterTitle: "系统设计", chapterDesc: "系统架构、核心模块设计、数据库设计", order: 4 },
        { chapterId: "CH-005", chapterTitle: "系统实现", chapterDesc: "核心功能实现、关键技术细节", order: 5 },
        { chapterId: "CH-006", chapterTitle: "测试验证", chapterDesc: "测试环境、测试用例、测试结果与分析", order: 6 },
        { chapterId: "CH-007", chapterTitle: "总结与展望", chapterDesc: "研究成果总结、不足与未来展望", order: 7 },
        { chapterId: "CH-008", chapterTitle: "致谢", chapterDesc: "致谢", order: 8 },
      ],
      pptPageCount: 12,
    },
  },
  // Mock-004 定制化结构填充（P1场景）
  {
    mockId: "MOCK-004",
    mockName: "定制化结构填充数据集",
    alignPRDRequirement: "【P1】定制化结构填充",
    targetBranch: ProcessBranch.CUSTOM_STRUCTURE,
    priority: Priority.P1,
    userInput: {
      instruction: "按照我指定的固定大纲，从上传的3份项目资料里匹配内容，生成一份客户项目宣讲PPT，固定大纲如下：1. 公司与项目背景介绍 2. 核心解决方案与优势 3. 项目落地案例与数据 4. 合作模式与报价 5. 答疑环节，严格按照这个结构填充，不改动大纲顺序与章节",
      docList: [
        {
          docId: "DOC-004-01",
          docName: "企业产品与解决方案手册",
          docContent: "公司介绍：国内领先的AIPPT解决方案服务商；核心解决方案：多文档私有知识生成PPT全流程解决方案；核心优势：无幻觉、可溯源、强逻辑、高还原度",
        },
        {
          docId: "DOC-004-02",
          docName: "标杆项目落地案例合集",
          docContent: "标杆客户1：某大型国企，实现多文档汇报PPT自动生成，效率提升80%；标杆客户2：某高校，实现教案PPT自动生成，备课效率提升70%；核心数据：客户满意度95%，生成效率提升75%以上",
        },
        {
          docId: "DOC-004-03",
          docName: "商务合作与报价体系",
          docContent: "合作模式：SaaS订阅模式、定制化部署模式；报价体系：基础版999元/年，企业版9999元/年，定制化部署按需报价；服务内容：产品使用培训、专属技术支持、定制化需求开发",
        },
      ],
    },
    triggerRule: "用户明确指定固定大纲章节，触发CUSTOM_STRUCTURE分支",
    expectedOutput: {
      intentModel: {
        theme: "AIPPT多文档解决方案 客户项目宣讲",
        usageScene: "客户商务宣讲",
        targetAudience: "企业客户",
        fixedChapters: ["公司与项目背景介绍", "核心解决方案与优势", "项目落地案例与数据", "合作模式与报价", "答疑环节"],
      },
      outlineList: [
        { chapterId: "CH-001", chapterTitle: "封面", chapterDesc: "AIPPT多文档解决方案 客户宣讲", order: 1 },
        { chapterId: "CH-002", chapterTitle: "公司与项目背景介绍", chapterDesc: "公司介绍、项目背景与行业现状", order: 2 },
        { chapterId: "CH-003", chapterTitle: "核心解决方案与优势", chapterDesc: "核心解决方案、核心能力与产品优势", order: 3 },
        { chapterId: "CH-004", chapterTitle: "项目落地案例与数据", chapterDesc: "标杆客户案例、落地效果与核心数据", order: 4 },
        { chapterId: "CH-005", chapterTitle: "合作模式与报价", chapterDesc: "合作模式、报价体系与服务内容", order: 5 },
        { chapterId: "CH-006", chapterTitle: "答疑环节", chapterDesc: "交流与答疑", order: 6 },
      ],
      pptPageCount: 7,
    },
  },
  // Mock-005 多文档平等融合生成（P1场景）
  {
    mockId: "MOCK-005",
    mockName: "多文档平等融合生成数据集",
    alignPRDRequirement: "【P1】多文档融合生成",
    targetBranch: ProcessBranch.EQUAL_MERGE,
    priority: Priority.P1,
    userInput: {
      instruction: "基于我上传的4份部门月度工作汇报，生成一份全部门Q1季度工作复盘PPT，所有文档权重一致，提炼各模块核心工作、成果、问题，形成完整的季度复盘逻辑",
      docList: [
        {
          docId: "DOC-005-01",
          docName: "产品部Q1月度工作汇报合集",
          docContent: "Q1核心工作：完成多文档生成PPT需求调研、PRD撰写、需求评审；核心成果：输出完整需求文档，明确产品 roadmap；核心问题：需求迭代节奏待优化",
        },
        {
          docId: "DOC-005-02",
          docName: "研发部Q1月度工作汇报合集",
          docContent: "Q1核心工作：完成多文档生成PPT核心模块开发、联调、测试；核心成果：核心功能上线，系统稳定性99.9%；核心问题：算法召回准确率待优化",
        },
        {
          docId: "DOC-005-03",
          docName: "运营部Q1月度工作汇报合集",
          docContent: "Q1核心工作：完成产品上线运营、用户调研、内容推广；核心成果：新增企业用户100+，用户活跃度提升50%；核心问题：用户教育不足，功能使用率待提升",
        },
        {
          docId: "DOC-005-04",
          docName: "销售部Q1月度工作汇报合集",
          docContent: "Q1核心工作：完成企业客户拓展、需求对接、合同签约；核心成果：签约企业客户30+，营收达成率120%；核心问题：客户定制化需求较多，产品标准化待提升",
        },
      ],
    },
    triggerRule: "用户未指定主干文档，要求所有文档权重一致，触发EQUAL_MERGE分支",
    expectedOutput: {
      intentModel: {
        theme: "全部门Q1季度工作复盘",
        usageScene: "全部门季度复盘会",
        targetAudience: "全部门员工与管理层",
      },
      outlineList: [
        { chapterId: "CH-001", chapterTitle: "封面", chapterDesc: "全部门Q1季度工作复盘", order: 1 },
        { chapterId: "CH-002", chapterTitle: "Q1整体工作回顾与核心目标达成", chapterDesc: "Q1整体目标、整体达成情况与核心成果", order: 2 },
        { chapterId: "CH-003", chapterTitle: "各部门核心工作与成果", chapterDesc: "产品、研发、运营、销售各部门核心工作与成果", order: 3 },
        { chapterId: "CH-004", chapterTitle: "跨部门协同问题与根因分析", chapterDesc: "核心问题、根因分析与改进方向", order: 4 },
        { chapterId: "CH-005", chapterTitle: "Q2整体工作规划与目标", chapterDesc: "Q2整体目标、各部门核心工作规划", order: 5 },
        { chapterId: "CH-006", chapterTitle: "总结与展望", chapterDesc: "整体总结与未来展望", order: 6 },
      ],
      pptPageCount: 10,
    },
  },
];
```

---

## 六、页面逻辑模型（仅定义核心逻辑，无样式要求）
```typescript
export const PageLogicModel = [
  {
    pageId: "INPUT_PAGE",
    pageName: "输入页面",
    coreState: ["userInstruction", "docList", "selectedMockId"],
    coreProps: ["mockDataSets"],
    coreEvents: [
      { eventName: "onMockSelect", action: "选中对应Mock数据集，自动填充指令与文档列表" },
      { eventName: "onDocUpload", action: "添加/删除文档，更新docList" },
      { eventName: "onInstructionChange", action: "更新用户指令" },
      { eventName: "onSubmit", action: "提交输入，触发状态机SUBMIT_INPUT事件" },
    ],
    coreLogic: "提供Mock数据集快捷选择，提交前校验指令与文档列表非空",
  },
  {
    pageId: "INTENT_SUPPLEMENT_PAGE",
    pageName: "意图补全页面",
    coreState: ["intentForm"],
    coreProps: ["missingIntentFields"],
    coreEvents: [
      { eventName: "onFormChange", action: "更新意图表单" },
      { eventName: "onSubmit", action: "提交补全数据，触发SUBMIT_INTENT_SUPPLEMENT事件" },
    ],
    coreLogic: "仅展示缺失的P0核心字段，提交前校验必填项完整",
  },
  {
    pageId: "OUTLINE_PREVIEW_PAGE",
    pageName: "大纲骨架预览页面",
    coreState: ["outlineList", "isEditing"],
    coreProps: ["currentBranch", "intentModel"],
    coreEvents: [
      { eventName: "onOutlineEdit", action: "切换编辑状态，修改大纲" },
      { eventName: "onRegenerate", action: "触发REGENERATE_OUTLINE事件" },
      { eventName: "onConfirm", action: "触发CONFIRM_OUTLINE事件" },
    ],
    coreLogic: "CUSTOM_STRUCTURE分支禁止修改大纲章节，MAIN_DOC分支禁止修改核心框架",
  },
  {
    pageId: "CONTENT_PREVIEW_PAGE",
    pageName: "内容预览页面",
    coreState: ["recallContentList"],
    coreProps: ["outlineList", "docList"],
    coreEvents: [
      { eventName: "onContentEdit", action: "编辑召回内容" },
      { eventName: "onGeneratePPT", action: "触发GENERATE_PPT事件" },
    ],
    coreLogic: "分章节展示内容，标注来源文档，执行无幻觉校验",
  },
  {
    pageId: "PPT_PREVIEW_PAGE",
    pageName: "PPT预览页面",
    coreState: ["pptPageList", "currentPageIndex"],
    coreProps: ["intentModel", "outlineList"],
    coreEvents: [
      { eventName: "onPageChange", action: "切换PPT页面预览" },
      { eventName: "onReset", action: "触发RESET事件，回到输入页面" },
    ],
    coreLogic: "分页展示PPT，展示来源标记，提供流程回溯入口",
  },
];
```

---

## 七、强制校验规则模型（PRD核心合规要求）
```typescript
export const ValidationRuleModel = {
  // 无幻觉校验（P0强制）
  noHallucinationRule: {
    priority: Priority.P0,
    validator: (content: RecallContentItem[], docList: DocumentItem[]) => {
      return content.every(item => docList.some(doc => doc.docId === item.sourceDocId));
    },
    errorMessage: "生成内容存在无来源的幻觉内容，所有内容必须来自用户上传的文档",
  },
  // 可溯源校验（P0强制）
  traceabilityRule: {
    priority: Priority.P0,
    validator: (pptPageList: PPTPageItem[]) => {
      return pptPageList.every(page => page.sourceMark);
    },
    errorMessage: "PPT内容未标注来源，不符合可溯源要求",
  },
  // 大纲合规校验（P0强制）
  outlineComplianceRule: {
    priority: Priority.P0,
    branchOverride: {
      [ProcessBranch.MAIN_DOC]: "大纲必须与主干文档的章节结构完全一致",
      [ProcessBranch.CUSTOM_STRUCTURE]: "大纲必须与用户指定的fixedChapters完全一致",
    },
    errorMessage: "大纲不符合对应分支的规则要求",
  },
  // 意图完整性校验（P0强制）
  intentIntegrityRule: {
    priority: Priority.P0,
    validator: (intent: IntentModel) => {
      return !!(intent.theme && intent.usageScene && intent.targetAudience);
    },
    errorMessage: "意图模型缺失P0核心字段，必须补充完整",
  },
};
```

---

## 【Cursor最终执行要求】
1. 基于以上模型生成完整React+TypeScript项目，所有类型、状态机、规则、Mock数据100%复用，不得修改PRD核心逻辑
2. 全局状态使用React Context/Zustand实现状态机全流程流转，分支规则通过BranchRuleEngine动态解析，不得硬编码
3. 选中Mock数据集时，自动触发对应分支流程，无AI能力时直接使用expectedOutput完成全流程模拟
4. 所有校验规则必须在对应流程节点执行，不满足规则时禁止进入下一节点
5. 页面路由使用React Router，每个页面对应PageLogicModel定义
6. 样式使用极简实现，无需美化，仅保证流程可正常操作
7. 生成代码必须可直接`npm install && npm run dev`运行，无报错