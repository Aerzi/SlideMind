<script setup lang="ts">
// Agent Sequence Diagram Visualization
</script>

<template>
  <div class="w-full overflow-x-auto custom-scrollbar flex justify-start lg:justify-center py-2 relative z-20">
    <svg width="840" height="520" viewBox="0 0 840 520" class="bg-[#000] rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-sans shrink-0 border border-gray-800">
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 z" fill="#f97316" />
        </marker>
      </defs>

      <!-- Lifelines -->
      <line x1="120" y1="40" x2="120" y2="490" stroke="#555" stroke-dasharray="4 4" stroke-width="1.5" />
      <line x1="280" y1="40" x2="280" y2="490" stroke="#555" stroke-dasharray="4 4" stroke-width="1.5" />
      <line x1="440" y1="40" x2="440" y2="490" stroke="#555" stroke-dasharray="4 4" stroke-width="1.5" />
      <line x1="600" y1="40" x2="600" y2="490" stroke="#555" stroke-dasharray="4 4" stroke-width="1.5" />
      <line x1="760" y1="40" x2="760" y2="490" stroke="#555" stroke-dasharray="4 4" stroke-width="1.5" />

      <!-- Headers -->
      <g transform="translate(120, 25)">
        <rect x="-45" y="-15" width="90" height="30" fill="#fef9c3" rx="2" />
        <text x="0" y="4" fill="#000" font-size="13" font-weight="bold" text-anchor="middle">主Agent</text>
      </g>
      <g transform="translate(280, 25)">
        <rect x="-45" y="-15" width="90" height="30" fill="#fef9c3" rx="2" />
        <text x="0" y="4" fill="#000" font-size="13" font-weight="bold" text-anchor="middle">主Agent</text>
      </g>
      <g transform="translate(440, 25)">
        <rect x="-45" y="-15" width="90" height="30" fill="#fef9c3" rx="2" />
        <text x="0" y="4" fill="#000" font-size="13" font-weight="bold" text-anchor="middle">私有知识</text>
      </g>
      <g transform="translate(600, 25)">
        <rect x="-45" y="-15" width="90" height="30" fill="#fef9c3" rx="2" />
        <text x="0" y="4" fill="#000" font-size="13" font-weight="bold" text-anchor="middle">意图澄清</text>
      </g>
      <g transform="translate(760, 25)">
        <rect x="-45" y="-15" width="90" height="30" fill="#fef9c3" rx="2" />
        <text x="0" y="4" fill="#000" font-size="13" font-weight="bold" text-anchor="middle">大纲生成</text>
      </g>

      <!-- Activation Boxes -->
      <!-- C1 -->
      <rect x="110" y="70" width="20" height="410" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />
      
      <!-- C2-1 -->
      <rect x="270" y="100" width="20" height="170" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />
      
      <!-- C3-1 -->
      <rect x="430" y="130" width="20" height="60" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />
      
      <!-- C4 -->
      <rect x="590" y="210" width="20" height="60" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />
      
      <!-- C2-2 -->
      <rect x="270" y="300" width="20" height="120" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />

      <!-- C3-2 -->
      <rect x="430" y="330" width="20" height="60" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />

      <!-- C5 -->
      <rect x="750" y="380" width="20" height="70" fill="#fff" stroke="#991b1b" stroke-width="1.5" rx="1" />

      <!-- Arrows and Texts -->
      <!-- 1 -->
      <line x1="20" y1="80" x2="105" y2="80" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="30" y="68" width="60" height="24" fill="#000" />
      <text x="60" y="84" fill="#e5e5e5" font-size="12" text-anchor="middle">提供输入</text>

      <!-- 2 -->
      <line x1="130" y1="110" x2="265" y2="110" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="155" y="98" width="86" height="24" fill="#000" />
      <text x="198" y="114" fill="#e5e5e5" font-size="12" text-anchor="middle">主Agent判断</text>

      <!-- 3 -->
      <line x1="290" y1="140" x2="425" y2="140" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="295" y="128" width="125" height="24" fill="#000" />
      <text x="358" y="144" fill="#e5e5e5" font-size="12" text-anchor="middle">对话: 获取私有知识摘要</text>

      <!-- 4 -->
      <line x1="425" y1="180" x2="295" y2="180" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrowhead)" />
      <rect x="295" y="168" width="125" height="24" fill="#000" />
      <text x="360" y="184" fill="#e5e5e5" font-size="12" text-anchor="middle">返回: 当前私有知识摘要</text>

      <!-- 5 -->
      <line x1="290" y1="220" x2="585" y2="220" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="360" y="208" width="160" height="24" fill="#000" />
      <text x="440" y="224" fill="#e5e5e5" font-size="12" text-anchor="middle">对话: 按照维度进行意图确认</text>

      <!-- 6 -->
      <line x1="585" y1="260" x2="135" y2="260" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrowhead)" />
      <rect x="290" y="248" width="140" height="24" fill="#000" />
      <text x="360" y="264" fill="#e5e5e5" font-size="12" text-anchor="middle">返回: 用户意图确认信息</text>

      <!-- 7 -->
      <line x1="130" y1="310" x2="265" y2="310" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="155" y="298" width="86" height="24" fill="#000" />
      <text x="198" y="314" fill="#e5e5e5" font-size="12" text-anchor="middle">主Agent判断</text>

      <!-- 8 -->
      <line x1="290" y1="340" x2="425" y2="340" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="295" y="328" width="125" height="24" fill="#000" />
      <text x="357" y="344" fill="#e5e5e5" font-size="12" text-anchor="middle">根据意图检索召回片段</text>

      <!-- 9 -->
      <line x1="290" y1="390" x2="745" y2="390" stroke="#f97316" stroke-width="1.5" marker-end="url(#arrowhead)" />
      <rect x="480" y="378" width="80" height="24" fill="#000" />
      <text x="520" y="394" fill="#e5e5e5" font-size="12" text-anchor="middle">对话: 提供草稿</text>

      <!-- 10 -->
      <line x1="745" y1="440" x2="135" y2="440" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrowhead)" />
      <rect x="380" y="428" width="120" height="24" fill="#000" />
      <text x="440" y="444" fill="#e5e5e5" font-size="12" text-anchor="middle">返回: 大纲生成结果</text>

      <!-- 11 -->
      <line x1="105" y1="470" x2="20" y2="470" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arrowhead)" />
      <rect x="25" y="458" width="80" height="24" fill="#000" />
      <text x="65" y="474" fill="#e5e5e5" font-size="12" text-anchor="middle">返回: 大纲生成结果</text>
    </svg>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
