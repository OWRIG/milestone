# S-Timeline Dashboard

一个专为飞书多维表格设计的S型时间线仪表盘插件，提供优雅的里程碑可视化体验。

## ✨ 特性

### 🎨 核心功能
- **S型曲线算法**：基于正弦波函数和d3-shape的平滑S型时间线布局
- **智能数据映射**：支持多维表格字段的灵活映射配置
- **实时预览**：配置过程中的实时数据预览和可视化更新
- **Dashboard API集成**：完整支持飞书Base仪表盘API工作流

### 🛠️ 技术特性
- **TypeScript**：完整的类型安全支持
- **响应式设计**：适配桌面端和移动端
- **主题适配**：自动适配飞书Base明暗主题
- **多语言支持**：中文、英文、日文界面
- **SVG渲染**：高性能的矢量图形渲染

### 📊 数据配置
- **表格选择**：动态获取多维表格列表
- **字段映射**：支持日期、标题、描述、状态字段配置
- **时间范围**：年度、月度、季度和自定义时间范围
- **状态管理**：完成、进行中、待处理状态可视化

## 🚀 快速开始

### 环境要求
- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器
- 现代浏览器支持（Chrome、Firefox、Safari、Edge）

### 安装依赖
```bash
npm install
```

### 开发环境
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## 📁 项目结构

```
src/
├── App.tsx                    # 应用程序入口
├── App.scss                   # 全局样式定义
├── components/
│   ├── Timeline/              # 主时间线组件
│   │   ├── index.tsx         # TimelineDashboard 主组件
│   │   ├── types.ts          # TypeScript 类型定义
│   │   ├── style.scss        # 时间线样式
│   │   ├── utils/            # 工具函数
│   │   │   ├── sAlgorithm.ts # S型曲线算法实现
│   │   │   └── dataProcessor.ts # 数据处理和API集成
│   │   └── components/       # 子组件
│   │       ├── ConfigPanel/  # 配置面板
│   │       │   ├── index.tsx
│   │       │   └── style.scss
│   │       └── Renderer/     # SVG渲染组件
│   │           ├── index.tsx # TimelineRenderer
│   │           ├── MilestoneNode.tsx # 里程碑节点组件
│   │           └── style.scss
│   ├── ColorPicker/          # 颜色选择组件
│   └── LoadApp/              # 应用加载组件
└── locales/                   # 国际化配置
    ├── i18n.ts               # i18n 配置
    ├── zh.json               # 中文语言包
    ├── en.json               # 英文语言包
    └── jp.json               # 日文语言包
```

## 🔧 配置说明

### 数据源配置
1. **选择表格**：从多维表格列表中选择数据源
2. **字段映射**：
   - 日期字段（必需）：用于时间轴排序的日期/时间字段
   - 标题字段（必需）：里程碑标题显示
   - 描述字段（可选）：详细描述信息
   - 状态字段（可选）：任务状态标识

### 时间范围配置
- **当年**：显示当前年度所有里程碑
- **当月**：显示当前月份里程碑
- **当季度**：显示当前季度里程碑
- **自定义**：手动设置开始和结束日期

### 样式配置
- **节点颜色**：里程碑节点的默认颜色
- **连接线颜色**：S型曲线的颜色
- **已完成颜色**：已完成里程碑的高亮颜色

### 布局配置
- **曲线张力**：控制S型曲线的弯曲程度（0.1-1.0）
- **节点大小**：里程碑节点的显示大小（8-32px）
- **最小间距**：相邻节点之间的最小距离（20-80px）
- **显示描述**：是否显示里程碑描述文本
- **自适应布局**：根据内容自动调整布局

## 🎨 S型算法详解

### 算法原理
本项目采用基于正弦波函数的S型曲线算法：

```typescript
// 核心算法公式
const sineValue = Math.sin(progress * Math.PI * 2 * curveTension);
const normalizedSine = (sineValue + 1) / 2;
const x = margin.left + normalizedSine * drawWidth;
const y = margin.top + progress * drawHeight;
```

### 特点
- **平滑过渡**：使用d3-shape的贝塞尔曲线插值
- **可调张力**：通过curveTension参数控制弯曲程度
- **自适应间距**：确保节点之间的最小可读距离
- **时间权重**：支持按实际时间间隔调整节点分布

## 🔌 API 集成

### Dashboard API 工作流
1. **配置阶段**：
   ```typescript
   await dashboard.saveConfig({
     dataConditions: [dataConditions],
     customConfig: config
   });
   ```

2. **展示阶段**：
   ```typescript
   // 配置模式
   const data = await dashboard.getPreviewData();
   
   // 查看模式
   const data = await dashboard.getData();
   ```

### 数据格式
```typescript
interface MilestoneData {
  id: string;
  date: Date;
  title: string;
  description?: string;
  status?: 'completed' | 'pending' | 'in-progress';
  completed?: boolean;
  x: number; // 算法计算的坐标
  y: number;
}
```

## 🌐 多语言支持

支持的语言：
- 🇨🇳 简体中文（zh）
- 🇺🇸 English（en）
- 🇯🇵 日本語（jp）

添加新语言：
1. 在 `src/locales/` 目录下创建新的语言文件
2. 参考现有文件结构添加翻译
3. 在 `i18n.ts` 中注册新语言

## 🔧 开发指南

### 技术栈
- **React 18**：用户界面框架
- **TypeScript 5**：静态类型检查
- **Vite**：构建工具和开发服务器
- **SCSS**：CSS预处理器
- **Semi UI**：飞书设计系统
- **d3-shape**：SVG路径生成
- **i18next**：国际化框架

### 代码规范
- 使用TypeScript严格模式
- 遵循Semi Design设计规范
- 组件采用函数式编程风格
- 使用CSS变量实现主题切换

### 测试和调试
```bash
# 开发环境热重载
npm run dev

# 构建并检查类型
npm run build

# 在浏览器中预览构建结果
npm run preview
```

## 📋 部署说明

### 飞书Base插件部署
1. 构建生产版本：`npm run build`
2. 将 `dist` 目录内容部署到CDN或静态服务器
3. 在飞书Base中配置插件URL
4. 测试各种仪表盘模式（创建、配置、查看、全屏）

### 部署注意事项
- `package.json` 中的 `output` 字段指定了部署目录为 `dist`
- 每次提交前必须运行 `npm run build` 生成最新的部署产物
- 确保构建后的文件已提交到版本控制系统

### 环境变量
无需额外的环境变量配置，所有配置通过Dashboard API动态获取。

## 🤝 贡献指南

欢迎提交问题和改进建议！

### 开发流程
1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建Pull Request

### 问题报告
请在GitHub Issues中提供：
- 问题描述和重现步骤
- 浏览器和版本信息
- 错误日志或截图
- 预期行为说明

## 📄 许可证

本项目采用 ISC 许可证。详见 LICENSE 文件。

## 🙏 致谢

- [飞书多维表格](https://base.feishu.cn/) - 提供强大的数据基础
- [Semi Design](https://semi.design/) - 优秀的设计系统
- [D3.js](https://d3js.org/) - 强大的数据可视化库
- [React](https://reactjs.org/) - 现代前端框架

---

如有问题或建议，请随时联系我们！ 📧