export interface PresetStep {
  id?: number;
  title: string;
  status: 'pending' | 'running' | 'completed';
  isExpanded: boolean;
  description: string;
  thought_title?: string;
  showThought?: boolean;
  action?: {
    icon: string;
    label: string;
    content: string;
  };
  result?: string;
}

export interface PresetSlide {
  id: number;
  pageNumber: number;
  tag?: string;
  title: string;
  items: {
    type: 'bullet' | 'subtitle' | 'footer';
    content: string;
    boldPrefix?: string;
  }[];
}

export interface AgentAnalysisPreset {
  id: string;
  topicDefault: string;
  aiGreetingText: string;
  phase1Steps: Omit<PresetStep, 'id'>[];
  intentForm: {
    presentationGoals: { id: string; title: string; tag?: string; desc: string }[];
    targetAudiences: { id: string; title: string; tag?: string; desc: string }[];
  };
  planningModuleText: string;
  planningModuleSkipText: string;
  planningModuleMarkdown: string;
  phase2Steps: Omit<PresetStep, 'id'>[];
  outlineResultTitle: string;
  outlineResultSlides: PresetSlide[];
}

export const defaultPresets: Record<string, AgentAnalysisPreset> = {
  'preset-1': {
    id: 'preset-1',
    topicDefault: '帮我写一份高性能生鲜电商客户端PDP模块研发实践汇报 PPT',
    aiGreetingText: '收到。我将帮你完成高性能生鲜电商客户端PDP模块研发实践汇报并输出 PPT，这是一个需要专业技术沉淀与工程化呈现的任务。',
    phase1Steps: [
      {
        title: '文档解析',
        status: 'running',
        isExpanded: true,
        description: '我将帮你处理这个文档并生成 PPT。让我先解析你上传的文档',
        action: {
          icon: 'document',
          label: '文档解析',
          content: '解析PDF文档'
        },
        result: '文档已成功解析！我已获取到文档内容，这是一份关于“高性能生鲜电商客户端PDP模块研发实践”的总结汇报，内容结构清晰，包含了混合架构实践、核心难点攻关及量化性能收益。我将基于文档内容和用户需求进行意图分析。',
      },
      {
        title: '意图分析',
        status: 'pending',
        isExpanded: true,
        description: '现在我将把解析后的文档信息传递给意图识别 Agent，以分析你的PPT制作需求。',
        thought_title: '已完成思考',
        showThought: false,
        action: {
          icon: 'idea',
          label: '意图确认',
          content: '确认用户制作 PPT 的关键信息'
        }
      }
    ],
    intentForm: {
      presentationGoals: [
        { id: 'report', title: '转正/实习述职', tag: '推荐', desc: '文档属于技术实践总结，适合团队内部评审或晋升答辩' },
        { id: 'share', title: '技术沙龙分享', desc: '可用于前端与客户端行业交流活动的主题分享' },
        { id: 'flow', title: '研发流程宣贯', desc: '用于企业内部技术架构重构的规范宣贯' },
        { id: 'edu', title: '新人入职培训', desc: '适合新员工熟悉 PDP 模块架构的培训使用' }
      ],
      targetAudiences: [
        { id: 'report', title: '技术评审委', tag: '推荐', desc: '关注架构选型、技术难点攻克及最终量化收益' },
        { id: 'share', title: '大前端团队', desc: '关注 RN 与 Kotlin 混合开发的具体实现与踩坑经验' },
        { id: 'flow', title: '业务产品线', desc: '关注首屏秒开与交互流畅度带来的业务指标提升' },
        { id: 'edu', title: '研发实习生', desc: '关注工程化管理、代码规范及问题排查方法论' }
      ]
    },
    planningModuleText: '已收到您的意图确认。基于您的选择，我已为您生成了本次 PPT 的任务规格书，请您查阅：',
    planningModuleSkipText: '收到。我将使用默认配置生成本次 PPT 的任务规格书，请您查阅：',
    planningModuleMarkdown: `# Sprint Contract - PPT任务规格书\n\n## 任务基本信息\n- 场景类型：向上汇报\n- 目标受众：CEO，1人，背景为销售背景\n- 演示时长：15分钟\n- 页数要求：10-12页\n- 数据来源：_q1_sales.xlsx（已附加）_\n\n## 内容规格\n- _第1页_：核心结论_（Q1整体情况，1句话+3个关键数字）_\n- _第2-4页_：三大亮点_（正向，各附数据支撑）_\n- _第5-7页_：三大问题_（负向，各附根因分析）_\n- _第8-9页_：Q2行动计划_（对应每个问题）_\n- _第10页_：附录-数据明细\n\n## 设计规格\n- 主色：#1A73E8_（企业色）_\n- 字体：标题使用方正黑体，正文使用思源宋体\n- 图表：数量对比用柱状图，趋势用折线图\n\n## 验收标准（直接映射评测体系）\n- L1：全部通过\n- L2a布局：≥ 75分\n- L3叙事：结论前置性 ≥ 4分，数据支撑性 ≥ 4分\n\n## 禁止事项\n- 正文每页不超过120字\n- 不使用模糊表述如"大幅增长"_（必须有数字）_\n- 不在正文页放超过2个图表`,
    phase2Steps: [
      {
        title: '知识检索',
        status: 'running',
        isExpanded: true,
        description: '根据确认的意图，我将从私有知识库中检索相关内容，确保大纲的专业性和针对性。',
        action: {
          icon: 'search',
          label: '内容检索',
          content: '检索关于“技术述职汇报”及受众相关的结构框架'
        },
        result: '检索完成。已获取 5 份高相关的技术答辩与重构总结模板作为参考依据。',
      },
      {
        title: '大纲生成',
        status: 'pending',
        isExpanded: true,
        description: '信息汇总完毕，正在为你生成 PPT 大纲草稿。',
        action: {
          icon: 'document',
          label: '生成大纲',
          content: '调用大纲生成模型'
        },
        result: '大纲生成完毕！即将为您呈现。',
      }
    ],
    outlineResultTitle: '高性能生鲜电商客户端PDP模块研发实践汇报',
    outlineResultSlides: [
      {
        id: 1,
        pageNumber: 1,
        tag: '封面',
        title: '高性能生鲜电商客户端 PDP 模块研发实践汇报',
        items: [
          { type: 'subtitle', content: '副标题：React Native 与 Kotlin 混合开发、性能优化' },
          { type: 'footer', content: '页脚补充：汇报人信息 | XXX 有限公司 客户端研发部' }
        ]
      },
      {
        id: 2,
        pageNumber: 2,
        title: '个人简介与实习概况',
        items: [
          { type: 'bullet', content: '实习时间：2025.07.10 ‒ 2025.09.24' },
          { type: 'bullet', content: '核心角色：混合架构研发小组成员' },
          { type: 'bullet', content: '主要职责：PDP 核心逻辑开发、Kotlin 原生插件封装、长列表性能调优、工程化质量保障。' }
        ]
      },
      {
        id: 3,
        pageNumber: 3,
        title: '行业背景与技术路线',
        items: [
          { type: 'bullet', boldPrefix: '生鲜电商特征：', content: '高频交互、强即时性、营销变动快' },
          { type: 'bullet', boldPrefix: '技术选型：', content: 'React Native（业务灵活性） + Kotlin（原生稳定性）' },
          { type: 'bullet', boldPrefix: '核心诉求：', content: '在保证研发效率的同时，追求不输于全原生的交互性能' }
        ]
      },
      {
        id: 4,
        pageNumber: 4,
        title: '核心项目：商品详情页(PDP)重构',
        items: [
          { type: 'bullet', boldPrefix: '挑战点：', content: 'SKU 多维规格联动、高清视频加载、长图文内存占用' },
          { type: 'bullet', boldPrefix: '现状分析：', content: '旧版页面在低端机存在滑动掉帧和规格切换卡顿' },
          { type: 'bullet', boldPrefix: '重构目标：', content: 'FPS 稳定 58+，首屏加载 400ms 以内' }
        ]
      },
      {
        id: 5,
        pageNumber: 5,
        title: '混合架构设计：Bridge 与 JSI 实践',
        items: [
          { type: 'bullet', boldPrefix: '架构分层：', content: 'UI 表现层(RN)、中间件层(JSI)、能力支撑层(Kotlin)' },
          { type: 'bullet', boldPrefix: '技术点：', content: '利用 JSI 实现同步调用，绕过 JSON 序列化开销' }
        ]
      },
      {
        id: 6,
        pageNumber: 6,
        title: '原生攻关：基于 Kotlin 的高性能多媒体组件',
        items: [
          { type: 'bullet', boldPrefix: '方案：', content: '封装 Google ExoPlayer，弃用纯 JS 视频库' },
          { type: 'bullet', boldPrefix: '特性：', content: '生命周期感应、硬件加速解码、Surface 生命周期管控' }
        ]
      },
      {
        id: 7,
        pageNumber: 7,
        title: '算法创新：SKU 路径字典逻辑',
        items: [
          { type: 'bullet', boldPrefix: '对比图：', content: 'O(n²) 递归查找 vs O(1) 字典查找' },
          { type: 'bullet', boldPrefix: '实现：', content: '全排列预处理生成路径字典' },
          { type: 'bullet', boldPrefix: '成果：', content: '规格切换响应耗时由 200ms 降至 30ms 以内' }
        ]
      },
      {
        id: 8,
        pageNumber: 8,
        title: '性能优化：长列表与内存治理',
        items: [
          { type: 'bullet', boldPrefix: '组件：', content: '从 FlatList 迁移至 RecyclerListView' },
          { type: 'bullet', boldPrefix: '策略：', content: '视图复用池、分级渲染、离屏强制回收' }
        ]
      },
      {
        id: 9,
        pageNumber: 9,
        title: '工程化管理：工业级质量保障',
        items: [
          { type: 'bullet', boldPrefix: '流程：', content: 'Gitflow 分支策略、Code Review、CI/CD 流水线' },
          { type: 'bullet', boldPrefix: '质量：', content: 'Jest 单元测试覆盖 SKU 算法，Lint 代码静态检查' }
        ]
      },
      {
        id: 10,
        pageNumber: 10,
        title: '量化成果：重构前后性能对比',
        items: [
          { type: 'bullet', boldPrefix: '表格对比：', content: 'FPS（45 -> 58.5）、首屏耗时（650ms -> 380ms）、Crash 率（<0.05%）' },
          { type: 'bullet', boldPrefix: '视觉展示：', content: '平滑度对比曲线、机型覆盖测试结果' }
        ]
      },
      {
        id: 11,
        pageNumber: 11,
        title: '总结与收获：从码农到工程师的蜕变',
        items: [
          { type: 'bullet', boldPrefix: '认知升级：', content: '从“实现功能”到“追求工程极致”' },
          { type: 'bullet', boldPrefix: '能力提升：', content: '混合开发底层原理、性能分析方法论、团队协作素养' }
        ]
      },
      {
        id: 12,
        pageNumber: 12,
        tag: '封底',
        title: '结语与 Q&A',
        items: [
          { type: 'bullet', boldPrefix: '结语：', content: '技术赋能民生，代码驱动效率' },
          { type: 'bullet', boldPrefix: '致谢：', content: '感谢导师与团队的信任与指导' }
        ]
      }
    ]
  }
};
