export type Priority = "P0" | "P1" | "P2"

export type ProcessBranch = 
  | "STRONG_INTENT"
  | "WEAK_INTENT"
  | "MAIN_DOC"
  | "CUSTOM_STRUCTURE"
  | "EQUAL_MERGE"

export type ProcessStatus =
  | "IDLE"
  | "INPUT_COMPLETE"
  | "INTENT_CHECKING"
  | "INTENT_MISSING"
  | "INTENT_CONFIRMED"
  | "OUTLINE_GENERATING"
  | "OUTLINE_CONFIRMED"
  | "CONTENT_RECALLING"
  | "CONTENT_RANKING"
  | "PPT_GENERATING"
  | "COMPLETE"
  | "ERROR"

export interface DocumentItem {
  docId: string;
  docName: string;
  docContent: string;
  isMainDoc?: boolean;
  isExcluded?: boolean;
}

export interface IntentModel {
  theme: string;
  usageScene: string;
  targetAudience: string;
  pageCount?: number;
  fixedChapters?: string[];
  mainDocId?: string;
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
  sourceMark: string;
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

export const MockDataSets: MockDataSet[] = [
  {
    mockId: "MOCK-001",
    mockName: "强意图定向生成数据集",
    alignPRDRequirement: "【P0】强意图定向生成",
    targetBranch: "STRONG_INTENT",
    priority: "P0",
    userInput: {
      instruction: "基于我上传的3份Q1项目复盘文档，生成一份面向部门总监的项目向上汇报PPT，核心主题是Q1产品迭代项目复盘与Q2规划，要求突出项目成果、问题复盘与后续动作",
      docList: [
        {
          docId: "DOC-001-01",
          docName: "Q1产品迭代项目整体复盘报告",
          docContent: "项目背景...",
        },
        {
          docId: "DOC-001-02",
          docName: "Q1项目核心功能迭代详情",
          docContent: "核心功能1...",
        },
        {
          docId: "DOC-001-03",
          docName: "Q2产品迭代规划方案",
          docContent: "Q2核心目标...",
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
  {
    mockId: "MOCK-002",
    mockName: "弱意图框架生成数据集",
    alignPRDRequirement: "【P0】弱意图框架生成",
    targetBranch: "WEAK_INTENT",
    priority: "P0",
    userInput: {
      instruction: "帮我用上传的4份文档，做一份PPT",
      docList: [
        { docId: "DOC-002-01", docName: "高中语文必修3 唐诗三首教案", docContent: "..." },
        { docId: "DOC-002-02", docName: "唐诗三首 知识点梳理", docContent: "..." },
        { docId: "DOC-002-03", docName: "唐诗三首 课堂练习题", docContent: "..." },
        { docId: "DOC-002-04", docName: "唐诗三首 作者生平与创作背景", docContent: "..." },
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
  {
    mockId: "MOCK-003",
    mockName: "指定主干文档生成数据集",
    alignPRDRequirement: "【P0】指定主干文档生成",
    targetBranch: "MAIN_DOC",
    priority: "P0",
    userInput: {
      instruction: "以我上传的《2026届毕业论文终稿》为主干文档，另外2份参考文献综述与调研数据报告作为补充，生成一份毕业论文答辩PPT，要求完全沿用论文的章节结构，不改动核心逻辑",
      docList: [
        { docId: "DOC-003-01", docName: "2026届计算机专业毕业论文终稿", docContent: "...", isMainDoc: true },
        { docId: "DOC-003-02", docName: "相关技术与参考文献综述", docContent: "..." },
        { docId: "DOC-003-03", docName: "系统测试调研数据报告", docContent: "..." },
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
  {
    mockId: "MOCK-004",
    mockName: "定制化结构填充数据集",
    alignPRDRequirement: "【P1】定制化结构填充",
    targetBranch: "CUSTOM_STRUCTURE",
    priority: "P1",
    userInput: {
      instruction: "按照我指定的固定大纲，从上传的3份项目资料里匹配内容，生成一份客户项目宣讲PPT，固定大纲如下：1. 公司与项目背景介绍 2. 核心解决方案与优势 3. 项目落地案例与数据 4. 合作模式与报价 5. 答疑环节，严格按照这个结构填充，不改动大纲顺序与章节",
      docList: [
        { docId: "DOC-004-01", docName: "企业产品与解决方案手册", docContent: "..." },
        { docId: "DOC-004-02", docName: "标杆项目落地案例合集", docContent: "..." },
        { docId: "DOC-004-03", docName: "商务合作与报价体系", docContent: "..." },
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
  {
    mockId: "MOCK-005",
    mockName: "多文档平等融合生成数据集",
    alignPRDRequirement: "【P1】多文档融合生成",
    targetBranch: "EQUAL_MERGE",
    priority: "P1",
    userInput: {
      instruction: "基于我上传的4份部门月度工作汇报，生成一份全部门Q1季度工作复盘PPT，所有文档权重一致，提炼各模块核心工作、成果、问题，形成完整的季度复盘逻辑",
      docList: [
        { docId: "DOC-005-01", docName: "产品部Q1月度工作汇报合集", docContent: "..." },
        { docId: "DOC-005-02", docName: "研发部Q1月度工作汇报合集", docContent: "..." },
        { docId: "DOC-005-03", docName: "运营部Q1月度工作汇报合集", docContent: "..." },
        { docId: "DOC-005-04", docName: "销售部Q1月度工作汇报合集", docContent: "..." },
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
