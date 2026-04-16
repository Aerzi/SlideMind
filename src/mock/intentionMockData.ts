export type Priority = "P0" | "P1" | "P2"

export type OutlineGenerateMode = 
  | "STRONG_INTENT" 
  | "WEAK_INTENT" 
  | "MAIN_DOC_INHERIT" 
  | "CUSTOM_STRUCTURE_FIXED" 
  | "EQUAL_DOCS_MERGE"

export interface ConfirmedIntentModel {
  theme: string;
  usageScene: string;
  targetAudience: string;
  fixedChapters?: string[]; 
  mainDocId?: string; 
  isEqualMerge?: boolean; 
  pageCountRange?: [number, number]; 
}

export interface DocumentItem {
  docId: string;
  docName: string;
  docContent: string;
  coreTags?: string[]; 
  isMainDoc?: boolean;
  isExcluded?: boolean;
}

export type OutlineLevel = 
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3"

export interface OutlineChapterNode {
  level: OutlineLevel;
  chapterNumber: string;
  chapterTitle: string;
  chapterDesc: string;
  order: number;
  parentChapterId?: string;
  chapterId: string;

  retrievalRule: {
    coreCommand: string;
    scope: {
      priorityDocIds: string[];
      excludedDocIds: string[];
    };
    weightRule: "mainDocFirst" | "allDocsEqual" | "customPriority";
    forbiddenRule: string[];
    mustIncludeKeywords: string[];
  };
}

export interface ConceptOutlineSkeleton {
  skeletonId: string;
  generateMode: OutlineGenerateMode;
  sourceIntent: ConfirmedIntentModel;
  sourceDocList: DocumentItem[];
  chapterList: OutlineChapterNode[];
  totalChapterCount: number;
  storyLine: string;
  isUserConfirmed: boolean;
  isValid: boolean;
}

export interface RecalledContentItem {
  chapterId: string;
  chapterTitle: string;
  recalledContent: string;
  sourceDocId: string;
}

export interface OutlineMockDataSet {
  mockId: string;
  mockName: string;
  generateMode: OutlineGenerateMode;
  input: {
    confirmedIntent: ConfirmedIntentModel;
    docList: DocumentItem[];
  };
  generateProcess: {
    matchedMode: string;
    matchedStoryLine?: string;
    executeRule: string;
    coreAction?: string;
  };
  outputOutlineSkeleton: ConceptOutlineSkeleton;
  expectedRetrievalResult?: RecalledContentItem[];
}

export const OutlineLinkMockDataSets: OutlineMockDataSet[] = [
  {
    mockId: "MOCK-OUTLINE-001",
    mockName: "PRD需求汇报场景Mock",
    generateMode: "STRONG_INTENT",
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
    generateProcess: {
      matchedMode: "STRONG_INTENT",
      matchedStoryLine: "总-分-总 汇报逻辑",
      executeRule: "OutlineGenerateRuleEngine.STRONG_INTENT.execute",
    },
    outputOutlineSkeleton: {
      skeletonId: "MOCK-SKELETON-001",
      generateMode: "STRONG_INTENT",
      sourceIntent: {
        theme: "私有文档生成全文PPT 需求汇报",
        usageScene: "向上汇报",
        targetAudience: "产品负责人与研发团队",
      },
      sourceDocList: [],
      totalChapterCount: 12,
      storyLine: "总-分-总 汇报逻辑",
      isUserConfirmed: false,
      isValid: true,
      chapterList: [
        {
          level: "LEVEL_1",
          chapterNumber: "一、",
          chapterTitle: "背景目标",
          chapterDesc: "项目背景、现状与核心目标",
          order: 1,
          chapterId: "chapter-1",
          retrievalRule: {
            coreCommand: "从所有上传文档中，提取【私有文档生成全文PPT 需求汇报】的背景目标相关整体概述，内容必须完全来自上传文档",
            scope: { priorityDocIds: ["DOC-001", "DOC-002", "DOC-003"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: ["禁止编造无来源内容", "禁止超出主题范围"],
            mustIncludeKeywords: ["私有文档生成全文PPT", "背景目标"],
          },
        },
        {
          level: "LEVEL_2",
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
          level: "LEVEL_2",
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
          level: "LEVEL_2",
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
          level: "LEVEL_1",
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
          level: "LEVEL_2",
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
          level: "LEVEL_2",
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
          level: "LEVEL_2",
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
          level: "LEVEL_3",
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
          level: "LEVEL_3",
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
          level: "LEVEL_1",
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
          level: "LEVEL_1",
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
  {
    mockId: "MOCK-OUTLINE-002",
    mockName: "毕业论文主干文档场景Mock",
    generateMode: "MAIN_DOC_INHERIT",
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
    generateProcess: {
      matchedMode: "MAIN_DOC_INHERIT",
      executeRule: "OutlineGenerateRuleEngine.MAIN_DOC_INHERIT.execute",
      coreAction: "100%继承主干毕业论文的章节结构",
    },
    outputOutlineSkeleton: {
      skeletonId: "MOCK-SKELETON-002",
      generateMode: "MAIN_DOC_INHERIT",
      sourceIntent: {
        theme: "基于RAG的多文档PPT生成系统 毕业论文答辩",
        usageScene: "论文答辩",
        targetAudience: "答辩评委",
      },
      sourceDocList: [],
      totalChapterCount: 1,
      storyLine: "继承主干文档",
      isUserConfirmed: false,
      isValid: true,
      chapterList: [
        { 
          level: "LEVEL_1", 
          chapterNumber: "一、", 
          chapterTitle: "绪论", 
          chapterDesc: "研究背景与意义",
          order: 1, 
          chapterId: "chapter-1",
          retrievalRule: { 
            coreCommand: "优先从毕业论文终稿中提取绪论章节的全部内容，参考文献综述仅做补充", 
            scope: { priorityDocIds: ["DOC-MAIN"], excludedDocIds: [] }, 
            weightRule: "mainDocFirst", 
            forbiddenRule: ["禁止修改主干文档的核心内容"], 
            mustIncludeKeywords: ["绪论", "研究背景"] 
          } 
        },
      ],
    },
    expectedRetrievalResult: [
      {
        chapterId: "chapter-1",
        chapterTitle: "绪论",
        recalledContent: "本文研究基于RAG的多文档PPT生成系统，绪论部分阐述了当前AIPPT技术的发展背景与存在的问题...",
        sourceDocId: "DOC-MAIN",
      },
    ],
  },
  {
    mockId: "MOCK-OUTLINE-003",
    mockName: "弱意图框架生成场景Mock",
    generateMode: "WEAK_INTENT",
    input: {
      confirmedIntent: {
        theme: "唐诗三首课堂教学",
        usageScene: "课堂教学",
        targetAudience: "高一学生",
      },
      docList: [
        {
          docId: "DOC-001",
          docName: "唐诗三首教案",
          docContent: "教学目标：掌握唐诗三首的诗词内容、创作背景、核心意象与情感表达",
          coreTags: ["唐诗三首", "教案", "教学目标", "诗词解析"],
        },
        {
          docId: "DOC-002",
          docName: "唐诗三首知识点梳理",
          docContent: "核心知识点：作者生平、诗词注释、意象解析、艺术手法",
          coreTags: ["知识点", "意象解析", "艺术手法", "作者生平"],
        },
      ],
    },
    generateProcess: {
      matchedMode: "WEAK_INTENT",
      executeRule: "OutlineGenerateRuleEngine.WEAK_INTENT.execute",
    },
    outputOutlineSkeleton: {
      skeletonId: "MOCK-SKELETON-003",
      generateMode: "WEAK_INTENT",
      sourceIntent: {
        theme: "唐诗三首课堂教学",
        usageScene: "课堂教学",
        targetAudience: "高一学生",
      },
      sourceDocList: [],
      totalChapterCount: 1,
      storyLine: "导入→知识点讲解→练习→总结",
      isUserConfirmed: false,
      isValid: true,
      chapterList: [
        {
          level: "LEVEL_1",
          chapterNumber: "一、",
          chapterTitle: "核心知识点讲解",
          chapterDesc: "唐诗三首核心知识点、意象解析、艺术手法",
          order: 1,
          chapterId: "chapter-1",
          retrievalRule: {
            coreCommand: "提取唐诗三首核心知识点、意象解析、艺术手法",
            scope: { priorityDocIds: ["DOC-001", "DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: [],
            mustIncludeKeywords: ["唐诗三首", "知识点", "意象解析"],
          }
        },
      ],
    },
    expectedRetrievalResult: [
      {
        chapterId: "chapter-1",
        chapterTitle: "核心知识点讲解",
        recalledContent: "本节课重点知识点在于解析《登高》中的意象表达与《琵琶行》的艺术手法对比，其中涵盖了杜甫生平的跌宕起伏...",
        sourceDocId: "DOC-002",
      },
    ],
  },
  {
    mockId: "MOCK-OUTLINE-004",
    mockName: "定制化固定结构场景Mock",
    generateMode: "CUSTOM_STRUCTURE_FIXED",
    input: {
      confirmedIntent: {
        theme: "企业客户解决方案宣讲",
        usageScene: "客户宣讲",
        targetAudience: "企业客户",
        fixedChapters: ["公司介绍", "核心解决方案", "落地案例", "合作模式", "报价体系"],
      },
      docList: [
        {
          docId: "DOC-001",
          docName: "企业解决方案手册",
          docContent: "公司介绍、核心解决方案、产品优势",
          coreTags: ["解决方案", "公司介绍", "产品优势"],
        },
        {
          docId: "DOC-002",
          docName: "客户案例合集",
          docContent: "标杆客户案例、落地效果、数据",
          coreTags: ["客户案例", "落地效果", "数据"],
        },
      ],
    },
    generateProcess: {
      matchedMode: "CUSTOM_STRUCTURE_FIXED",
      executeRule: "OutlineGenerateRuleEngine.CUSTOM_STRUCTURE_FIXED.execute",
    },
    outputOutlineSkeleton: {
      skeletonId: "MOCK-SKELETON-004",
      generateMode: "CUSTOM_STRUCTURE_FIXED",
      sourceIntent: {
        theme: "企业客户解决方案宣讲",
        usageScene: "客户宣讲",
        targetAudience: "企业客户",
      },
      sourceDocList: [],
      totalChapterCount: 1,
      storyLine: "完全遵循用户指定的固定结构",
      isUserConfirmed: false,
      isValid: true,
      chapterList: [
        {
          level: "LEVEL_1",
          chapterNumber: "三、",
          chapterTitle: "落地案例",
          chapterDesc: "标杆客户落地案例、效果数据",
          order: 3,
          chapterId: "chapter-3",
          retrievalRule: {
            coreCommand: "提取企业解决方案宣讲的落地案例、客户案例、效果数据",
            scope: { priorityDocIds: ["DOC-002"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: [],
            mustIncludeKeywords: ["落地案例", "客户案例", "数据"],
          }
        },
      ],
    },
    expectedRetrievalResult: [
      {
        chapterId: "chapter-3",
        chapterTitle: "落地案例",
        recalledContent: "在某科技头部企业的标杆案例中，解决方案成功落地后，为企业节省了30%的人力成本，整体运营效率提升40%...",
        sourceDocId: "DOC-002",
      },
    ],
  },
  {
    mockId: "MOCK-OUTLINE-005",
    mockName: "多文档平等融合生成场景Mock",
    generateMode: "EQUAL_DOCS_MERGE",
    input: {
      confirmedIntent: {
        theme: "全部门Q1季度工作复盘",
        usageScene: "部门复盘会",
        targetAudience: "全部门员工",
        isEqualMerge: true,
      },
      docList: [
        {
          docId: "DOC-PRODUCT",
          docName: "产品部Q1工作汇报",
          docContent: "Q1完成需求调研、PRD撰写、需求评审，核心成果：输出完整产品 roadmap",
          coreTags: ["产品部", "需求", "PRD", "roadmap"],
        },
        {
          docId: "DOC-DEV",
          docName: "研发部Q1工作汇报",
          docContent: "Q1完成核心模块开发、联调、测试，核心成果：系统上线，稳定性99.9%",
          coreTags: ["研发部", "开发", "测试", "系统稳定性"],
        },
      ],
    },
    generateProcess: {
      matchedMode: "EQUAL_DOCS_MERGE",
      executeRule: "OutlineGenerateRuleEngine.EQUAL_DOCS_MERGE.execute",
    },
    outputOutlineSkeleton: {
      skeletonId: "MOCK-SKELETON-005",
      generateMode: "EQUAL_DOCS_MERGE",
      sourceIntent: {
        theme: "全部门Q1季度工作复盘",
        usageScene: "部门复盘会",
        targetAudience: "全部门员工",
      },
      sourceDocList: [],
      totalChapterCount: 1,
      storyLine: "全文档内容融合重构的全局递进逻辑",
      isUserConfirmed: false,
      isValid: true,
      chapterList: [
        {
          level: "LEVEL_1",
          chapterNumber: "二、",
          chapterTitle: "各部门核心工作与成果",
          chapterDesc: "产品、研发、运营各部门Q1核心工作与成果",
          order: 2,
          chapterId: "chapter-2",
          retrievalRule: {
            coreCommand: "提取全部门Q1季度工作复盘各部门核心工作与成果",
            scope: { priorityDocIds: ["DOC-PRODUCT", "DOC-DEV"], excludedDocIds: [] },
            weightRule: "allDocsEqual",
            forbiddenRule: [],
            mustIncludeKeywords: ["Q1", "核心工作", "成果"],
          }
        },
      ],
    },
    expectedRetrievalResult: [
      {
        chapterId: "chapter-2",
        chapterTitle: "各部门核心工作与成果",
        recalledContent: "产品部输出完整产品roadmap，研发部完成系统上线且稳定性达99.9%，各部门核心目标基本达成",
        sourceDocId: "DOC-PRODUCT, DOC-DEV",
      },
    ],
  },
];
