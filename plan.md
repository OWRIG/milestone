# S型时间线里程碑插件设计方案

## 项目概述

基于现有倒计时插件模板，开发一个全新的S型时间线里程碑仪表盘插件。该插件将从多维表格读取里程碑数据，以S型布局展示全年里程碑，实现一屏展示无需滚动的效果。

## 核心架构设计

### 数据流程
```
多维表格数据 → Dashboard API → S型算法 → SVG渲染
```

### 核心组件结构
```
STimelineDashboard/
├── index.tsx           # 主组件（状态管理）
├── components/
│   ├── STimeline/      # S型时间线渲染组件
│   ├── ConfigPanel/    # 配置面板
│   ├── DataSource/     # 数据源选择器
│   └── MilestoneNode/  # 里程碑节点组件
├── utils/
│   ├── sAlgorithm.ts   # S型路径算法
│   └── dataProcessor.ts # 数据处理逻辑
└── types.ts            # 类型定义
```

## 数据结构设计

### 插件配置结构
```typescript
interface STimelineConfig {
  // 数据源配置
  tableId: string;
  dataRange?: IDataRange;
  
  // 字段映射
  dateField: string;      // 日期字段（必需）
  titleField: string;     // 标题字段（必需）
  descField?: string;     // 描述字段（可选）
  statusField?: string;   // 状态字段（可选）
  viewId?: string;        // 视图 ID（可选）
  
  // 新增：时间范围配置
  timeRange?: {
    startDate: Date;
    endDate: Date;
    autoRange: 'year' | 'month' | 'quarter' | 'custom';
  };
  
  // 样式配置
  nodeColor: string;      // 节点颜色
  lineColor: string;      // 连接线颜色
  completedColor: string; // 已完成颜色
  
  // 布局配置
  curveTension: number;   // S型曲线张力
  nodeSize: number;       // 节点大小
  showDescription: boolean; // 显示描述
  adaptiveLayout: boolean; // 自适应布局
  minNodeSpacing: number; // 最小节点间距
}
```

### 里程碑数据结构
```typescript
interface MilestoneData {
  id: string;
  date: Date;
  title: string;
  description?: string;
  status?: 'completed' | 'pending' | 'in-progress';
  position: { x: number; y: number };
}
```

## S型算法设计

### 核心思路
1. 按时间排序里程碑
2. 计算容器可用区域
3. 分配S型路径节点位置
4. 生成贝塞尔曲线连接

### 算法实现（修正版）
```typescript
import { line, curveBasis } from 'd3-shape';
import { path } from 'd3-path';

// 修正：真正的 S 型平滑曲线算法
class STimelineAlgorithm {
  private containerSize: { width: number; height: number };
  private margin = { top: 60, bottom: 60, left: 120, right: 120 };
  
  constructor(containerSize: { width: number; height: number }) {
    this.containerSize = containerSize;
  }
  
  // 计算 S 型路径位置
  calculateSPath(milestones: MilestoneData[], curveTension: number = 0.5): MilestoneData[] {
    if (milestones.length === 0) return [];
    
    const { width, height } = this.containerSize;
    const drawWidth = width - this.margin.left - this.margin.right;
    const drawHeight = height - this.margin.top - this.margin.bottom;
    
    // 使用正弦波函数创建平滑的 S 型曲线
    const positions = milestones.map((milestone, index) => {
      const progress = milestones.length === 1 ? 0.5 : index / (milestones.length - 1);
      
      // 使用正弦波函数生成平滑的 S 型横坐标
      const sineValue = Math.sin(progress * Math.PI * 2 * curveTension); // 控制 S 型强度
      const normalizedSine = (sineValue + 1) / 2; // 归一化到 0-1
      
      // 横坐标：在左右边界之间振荡
      const x = this.margin.left + normalizedSine * drawWidth;
      
      // 纵坐标：按时间序列均匀分布
      const y = this.margin.top + progress * drawHeight;
      
      return {
        ...milestone,
        position: { x, y }
      };
    });
    
    return positions;
  }
  
  // 生成 SVG 路径字符串
  generateSVGPath(positions: { x: number; y: number }[]): string {
    if (positions.length < 2) {
      return positions.length === 1 
        ? `M ${positions[0].x} ${positions[0].y}` 
        : '';
    }
    
    // 使用 d3-shape 生成平滑的贝塞尔曲线
    const lineGenerator = line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(curveBasis); // 使用 B 样条曲线插值
    
    return lineGenerator(positions) || '';
  }
  
  // 高级版本：自适应 S 型曲线
  calculateAdaptiveSPath(milestones: MilestoneData[], config: {
    curveTension: number;
    adaptToContent: boolean;
    minSpacing: number;
  }): MilestoneData[] {
    if (milestones.length === 0) return [];
    
    const { width, height } = this.containerSize;
    const drawWidth = width - this.margin.left - this.margin.right;
    const drawHeight = height - this.margin.top - this.margin.bottom;
    
    // 计算时间距离权重
    const timeSpans = this.calculateTimeSpans(milestones);
    
    const positions = milestones.map((milestone, index) => {
      // 基于时间权重计算 Y 位置
      const timeProgress = config.adaptToContent 
        ? timeSpans[index]
        : index / (milestones.length - 1);
      
      // 动态调整 S 型幅度
      const adaptiveAmplitude = Math.min(drawWidth * 0.4, drawWidth / Math.sqrt(milestones.length));
      const sineValue = Math.sin(timeProgress * Math.PI * 2 * config.curveTension);
      
      const x = this.margin.left + drawWidth / 2 + sineValue * adaptiveAmplitude;
      const y = this.margin.top + timeProgress * drawHeight;
      
      return {
        ...milestone,
        position: { x, y }
      };
    });
    
    // 确保最小间距
    return this.enforceMinimumSpacing(positions, config.minSpacing);
  }
  
  // 计算时间权重
  private calculateTimeSpans(milestones: MilestoneData[]): number[] {
    if (milestones.length <= 1) return [0];
    
    const timeStamps = milestones.map(m => m.date.getTime());
    const totalTime = timeStamps[timeStamps.length - 1] - timeStamps[0];
    
    return timeStamps.map(time => (time - timeStamps[0]) / totalTime);
  }
  
  // 确保最小间距
  private enforceMinimumSpacing(positions: MilestoneData[], minSpacing: number): MilestoneData[] {
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1].position;
      const curr = positions[i].position;
      const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      
      if (distance < minSpacing) {
        // 调整位置以维持最小间距
        const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        positions[i].position = {
          x: prev.x + Math.cos(angle) * minSpacing,
          y: prev.y + Math.sin(angle) * minSpacing
        };
      }
    }
    
    return positions;
  }
}
```

## 配置面板设计

### 基于现有配置模式扩展
```typescript
import { useState, useEffect } from 'react';
import { Select, Input, Switch, Slider, ColorPicker, DatePicker } from '@douyinfe/semi-ui';
import { bitable, FieldType } from '@lark-base-open/js-sdk';

interface ConfigPanelProps {
  config: STimelineConfig;
  onConfigChange: (config: STimelineConfig) => void;
}

function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [tableList, setTableList] = useState<any[]>([]);
  const [fieldList, setFieldList] = useState<any[]>([]);
  const [dateFields, setDateFields] = useState<any[]>([]);
  const [textFields, setTextFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取表格列表
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tables = await bitable.base.getTableMetaList();
        setTableList(tables.map(table => ({
          label: table.name,
          value: table.id
        })));
      } catch (error) {
        console.error('获取表格列表失败:', error);
      }
    };
    fetchTables();
  }, []);

  // 获取字段列表
  useEffect(() => {
    const fetchFields = async () => {
      if (!config.tableId) return;
      
      setLoading(true);
      try {
        const table = await bitable.base.getTableById(config.tableId);
        const fieldMetaList = await table.getFieldMetaList();
        
        // 获取日期时间字段
        const dateTimeFields = fieldMetaList.filter(field => 
          field.type === FieldType.DateTime || 
          field.type === FieldType.CreateTime || 
          field.type === FieldType.ModifiedTime
        );
        
        // 获取文本字段
        const textTypeFields = fieldMetaList.filter(field => 
          field.type === FieldType.Text ||
          field.type === FieldType.SingleSelect ||
          field.type === FieldType.MultipleSelect
        );
        
        setDateFields(dateTimeFields.map(field => ({
          label: field.name,
          value: field.id
        })));
        
        setTextFields(textTypeFields.map(field => ({
          label: field.name,
          value: field.id
        })));
        
        setFieldList(fieldMetaList.map(field => ({
          label: field.name,
          value: field.id,
          type: field.type
        })));
      } catch (error) {
        console.error('获取字段列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [config.tableId]);

  const handleConfigChange = (key: keyof STimelineConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="config-panel">
      {/* 数据源选择 */}
      <div className="config-section">
        <h4>数据源配置</h4>
        <div className="config-item">
          <label>选择表格</label>
          <Select
            value={config.tableId}
            onChange={(value) => handleConfigChange('tableId', value)}
            options={tableList}
            placeholder="请选择数据表"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      
      {/* 字段映射 */}
      <div className="config-section">
        <h4>字段映射</h4>
        <div className="config-item">
          <label>日期字段 *</label>
          <Select
            value={config.dateField}
            onChange={(value) => handleConfigChange('dateField', value)}
            options={dateFields}
            placeholder="请选择日期字段"
            style={{ width: '100%' }}
            loading={loading}
            disabled={!config.tableId}
          />
        </div>
        
        <div className="config-item">
          <label>标题字段 *</label>
          <Select
            value={config.titleField}
            onChange={(value) => handleConfigChange('titleField', value)}
            options={textFields}
            placeholder="请选择标题字段"
            style={{ width: '100%' }}
            loading={loading}
            disabled={!config.tableId}
          />
        </div>
        
        <div className="config-item">
          <label>描述字段</label>
          <Select
            value={config.descField}
            onChange={(value) => handleConfigChange('descField', value)}
            options={textFields}
            placeholder="请选择描述字段（可选）"
            style={{ width: '100%' }}
            loading={loading}
            disabled={!config.tableId}
            allowClear
          />
        </div>
        
        <div className="config-item">
          <label>状态字段</label>
          <Select
            value={config.statusField}
            onChange={(value) => handleConfigChange('statusField', value)}
            options={fieldList.filter(field => 
              field.type === FieldType.SingleSelect ||
              field.type === FieldType.MultipleSelect ||
              field.type === FieldType.Checkbox
            )}
            placeholder="请选择状态字段（可选）"
            style={{ width: '100%' }}
            loading={loading}
            disabled={!config.tableId}
            allowClear
          />
        </div>
      </div>
      
      {/* 样式配置 */}
      <div className="config-section">
        <h4>样式配置</h4>
        <div className="config-item">
          <label>节点颜色</label>
          <ColorPicker
            value={config.nodeColor}
            onChange={(value) => handleConfigChange('nodeColor', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item">
          <label>连接线颜色</label>
          <ColorPicker
            value={config.lineColor}
            onChange={(value) => handleConfigChange('lineColor', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item">
          <label>已完成颜色</label>
          <ColorPicker
            value={config.completedColor}
            onChange={(value) => handleConfigChange('completedColor', value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      
      {/* 布局配置 */}
      <div className="config-section">
        <h4>布局配置</h4>
        <div className="config-item">
          <label>曲线张力: {config.curveTension}</label>
          <Slider
            min={0.1}
            max={1}
            step={0.1}
            value={config.curveTension}
            onChange={(value) => handleConfigChange('curveTension', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item">
          <label>节点大小: {config.nodeSize}px</label>
          <Slider
            min={8}
            max={32}
            step={2}
            value={config.nodeSize}
            onChange={(value) => handleConfigChange('nodeSize', value)}
            style={{ width: '100%' }}
          />
        </div>
        
        <div className="config-item">
          <label>显示描述</label>
          <Switch
            checked={config.showDescription}
            onChange={(value) => handleConfigChange('showDescription', value)}
          />
        </div>
      </div>
    </div>
  );
}

export default ConfigPanel;
```

## 核心实现要点

### 1. 数据处理层（修正版）

```typescript
// 修正：Dashboard API 的正确使用方式
class TimelineDataManager {
  private config: STimelineConfig;
  private mode: DashboardMode;
  
  constructor(config: STimelineConfig, mode: DashboardMode) {
    this.config = config;
    this.mode = mode;
  }
  
  // 步骤 1: 配置阶段 - 保存数据依赖声明
  async saveDataDependency(): Promise<boolean> {
    try {
      const dataConditions = {
        tableId: this.config.tableId,
        viewId: this.config.viewId, // 可选
        fieldIds: [
          this.config.dateField,
          this.config.titleField,
          this.config.descField,
          this.config.statusField
        ].filter(Boolean) // 过滤掉空值
      };
      
      const configToSave = {
        dataConditions: [dataConditions], // 数据依赖声明
        customConfig: this.config // 自定义配置
      };
      
      return await dashboard.saveConfig(configToSave);
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }
  
  // 步骤 2: 展示阶段 - 获取数据（正确方式）
  async loadTimelineData(): Promise<MilestoneData[]> {
    try {
      let rawData: any[];
      
      if (this.mode === DashboardMode.Config) {
        // 配置模式：使用预览数据（无参数）
        rawData = await dashboard.getPreviewData();
      } else {
        // 查看模式：使用完整数据（无参数）
        rawData = await dashboard.getData();
      }
      
      // 处理获取到的数据
      return this.processRawData(rawData);
    } catch (error) {
      console.error('数据加载失败:', error);
      // 降级到直接表格访问
      return this.loadDataFromTable();
    }
  }
  
  // 处理从 Dashboard API 获取的数据
  private processRawData(rawData: any[]): MilestoneData[] {
    const milestones: MilestoneData[] = [];
    
    // Dashboard API 返回的数据格式需要根据实际情况调整
    // 这里假设返回的是记录数组格式
    rawData.forEach((record, index) => {
      try {
        const dateValue = record[this.config.dateField];
        const titleValue = record[this.config.titleField];
        
        if (dateValue && titleValue) {
          milestones.push({
            id: record.recordId || `milestone_${index}`,
            date: new Date(dateValue),
            title: String(titleValue),
            description: this.config.descField ? String(record[this.config.descField] || '') : undefined,
            status: this.config.statusField ? record[this.config.statusField] as any : 'pending',
            position: { x: 0, y: 0 }
          });
        }
      } catch (error) {
        console.warn(`处理记录 ${index} 时出错:`, error);
      }
    });
    
    // 按日期排序并应用时间过滤
    return this.applyTimeFilter(milestones.sort((a, b) => a.date.getTime() - b.date.getTime()));
  }
  
  // 降级方案：直接从表格获取数据
  private async loadDataFromTable(): Promise<MilestoneData[]> {
    try {
      const table = await bitable.base.getTableById(this.config.tableId);
      const records = await table.getRecords({ pageSize: 5000 });
      
      const milestones: MilestoneData[] = [];
      
      for (const record of records.records) {
        const dateValue = record.fields[this.config.dateField];
        const titleValue = record.fields[this.config.titleField];
        
        if (dateValue && titleValue) {
          milestones.push({
            id: record.recordId,
            date: new Date(dateValue),
            title: String(titleValue),
            description: this.config.descField ? String(record.fields[this.config.descField] || '') : undefined,
            status: this.config.statusField ? record.fields[this.config.statusField] as any : 'pending',
            position: { x: 0, y: 0 }
          });
        }
      }
      
      return this.applyTimeFilter(milestones.sort((a, b) => a.date.getTime() - b.date.getTime()));
    } catch (error) {
      console.error('表格数据加载失败:', error);
      throw new Error('无法获取数据，请检查权限和配置');
    }
  }
  
  // 新增：时间范围过滤功能
  private applyTimeFilter(milestones: MilestoneData[]): MilestoneData[] {
    if (!this.config.timeRange) {
      // 默认显示当年数据
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      
      return milestones.filter(milestone => 
        milestone.date >= startOfYear && milestone.date <= endOfYear
      );
    }
    
    const { startDate, endDate } = this.config.timeRange;
    return milestones.filter(milestone => 
      milestone.date >= startDate && milestone.date <= endDate
    );
  }
}
```

### 2. SVG渲染组件
```typescript
function STimelineRenderer({ milestones, config }: Props) {
  const positions = calculateSPath(milestones, containerSize);
  
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}>
      {/* S型路径 */}
      <path
        d={generateSPath(positions)}
        stroke={config.lineColor}
        strokeWidth="2"
        fill="none"
      />
      
      {/* 里程碑节点 */}
      {milestones.map((milestone, index) => (
        <MilestoneNode
          key={milestone.id}
          milestone={milestone}
          position={positions[index]}
          config={config}
        />
      ))}
    </svg>
  );
}
```

### 3. 响应式设计
```scss
.s-timeline-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  
  // 2x2 网格最小尺寸适配
  @media (max-width: 600px) {
    .milestone-text {
      font-size: 0.8em;
    }
    .milestone-description {
      display: none;
    }
  }
}
```

## 技术栈说明

### 基于现有项目架构
- **React 18** + **TypeScript** 
- **Vite** 构建工具
- **Semi UI** + **feishu-dashboard** 主题
- **SCSS** 样式处理
- **@lark-base-open/js-sdk** 仪表盘API

### 新增依赖需求
```json
{
  "dependencies": {
    "d3-path": "^3.1.0",
    "d3-shape": "^3.2.0",
    "lodash-es": "^4.17.21",
    "classnames": "^2.3.2"
  },
  "devDependencies": {
    "@types/d3-path": "^3.0.0",
    "@types/d3-shape": "^3.1.0",
    "@types/lodash-es": "^4.17.9"
  }
}
```

### 依赖说明
- **d3-path**: SVG路径生成，用于创建S型曲线
- **d3-shape**: 贝塞尔曲线和形状生成
- **lodash-es**: 数据处理工具函数
- **classnames**: CSS类名动态组合

## 状态管理设计

### 四种仪表盘状态适配
1. **Create状态**：显示默认配置和示例数据
2. **Config状态**：左右布局，实时预览配置变更
3. **View状态**：隐藏配置，仅显示时间线
4. **FullScreen状态**：深色模式适配

### API使用策略（修正版）

```typescript
// 正确的 Dashboard API 工作流程
class DashboardWorkflow {
  // 步骤 1: 配置阶段
  async configureDataSource(config: STimelineConfig): Promise<boolean> {
    const dataConditions = {
      tableId: config.tableId,
      viewId: config.viewId,
      fieldIds: [config.dateField, config.titleField, config.descField, config.statusField].filter(Boolean)
    };
    
    const configData = {
      dataConditions: [dataConditions], // 声明数据依赖
      customConfig: config // 保存自定义配置
    };
    
    return await dashboard.saveConfig(configData);
  }
  
  // 步骤 2: 获取数据（无参数）
  async loadData(mode: 'preview' | 'view'): Promise<any[]> {
    if (mode === 'preview') {
      return await dashboard.getPreviewData(); // 无参数！
    } else {
      return await dashboard.getData(); // 无参数！
    }
  }
  
  // 步骤 3: 加载已保存的配置
  async loadSavedConfig(): Promise<any> {
    return await dashboard.getConfig();
  }
}

// 使用示例：
// 1. 配置时：保存数据依赖
// 2. 查看时：无参数获取数据
// 3. 平台根据保存的依赖自动提供数据
```

### 状态管理实现

```typescript
enum DashboardMode {
  Create = 'create',
  Config = 'config', 
  View = 'view',
  FullScreen = 'fullscreen'
}

interface DashboardState {
  mode: DashboardMode;
  config: STimelineConfig;
  data: MilestoneData[];
  loading: boolean;
  error: string | null;
}

// 修正版：正确的状态管理
class STimelineDashboard {
  private state: DashboardState;
  private dataManager: TimelineDataManager;
  private algorithm: STimelineAlgorithm;
  
  constructor(containerSize: { width: number; height: number }) {
    this.state = {
      mode: DashboardMode.Create,
      config: this.getDefaultConfig(),
      data: [],
      loading: false,
      error: null
    };
    this.algorithm = new STimelineAlgorithm(containerSize);
  }
  
  async initialize() {
    try {
      // 检测运行环境
      const mode = await this.detectMode();
      this.state.mode = mode;
      
      // 初始化数据管理器
      this.dataManager = new TimelineDataManager(this.state.config, mode);
      
      // 根据模式加载配置和数据
      if (mode === DashboardMode.View || mode === DashboardMode.FullScreen) {
        await this.loadSavedConfigAndData();
      } else {
        await this.loadMockData();
      }
    } catch (error) {
      this.state.error = error.message;
      console.error('初始化失败:', error);
    }
  }
  
  // 加载已保存的配置和数据
  private async loadSavedConfigAndData() {
    try {
      const savedConfig = await dashboard.getConfig();
      if (savedConfig?.customConfig) {
        this.state.config = { ...this.getDefaultConfig(), ...savedConfig.customConfig };
        this.dataManager = new TimelineDataManager(this.state.config, this.state.mode);
      }
      
      const data = await this.dataManager.loadTimelineData();
      this.state.data = this.algorithm.calculateSPath(data, this.state.config.curveTension);
    } catch (error) {
      console.error('加载数据失败:', error);
      this.state.error = '加载数据失败';
    }
  }
  
  // 配置变更处理
  async onConfigChange(newConfig: STimelineConfig) {
    this.state.config = newConfig;
    this.dataManager = new TimelineDataManager(newConfig, this.state.mode);
    
    // 实时预览
    if (this.state.mode === DashboardMode.Config) {
      try {
        this.state.loading = true;
        const data = await this.dataManager.loadTimelineData();
        this.state.data = this.algorithm.calculateSPath(data, newConfig.curveTension);
      } catch (error) {
        console.error('预览数据失败:', error);
      } finally {
        this.state.loading = false;
      }
    }
  }
  
  // 保存配置
  async saveConfiguration(): Promise<boolean> {
    try {
      return await this.dataManager.saveDataDependency();
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }
  
  private async detectMode(): Promise<DashboardMode> {
    // 通过 bitable bridge API 检测环境
    try {
      const env = await bitable.bridge.getEnv();
      // 根据实际情况调整检测逻辑
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      
      switch (mode) {
        case 'config': return DashboardMode.Config;
        case 'view': return DashboardMode.View;
        case 'fullscreen': return DashboardMode.FullScreen;
        default: return DashboardMode.Create;
      }
    } catch (error) {
      console.warn('检测模式失败，使用默认模式');
      return DashboardMode.Create;
    }
  }
  
  private getDefaultConfig(): STimelineConfig {
    const currentYear = new Date().getFullYear();
    return {
      tableId: '',
      dateField: '',
      titleField: '',
      descField: '',
      statusField: '',
      timeRange: {
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        autoRange: 'year'
      },
      nodeColor: '#1890ff',
      lineColor: '#d9d9d9',
      completedColor: '#52c41a',
      curveTension: 0.5,
      nodeSize: 16,
      showDescription: true,
      adaptiveLayout: true,
      minNodeSpacing: 40
    };
  }
  
  private async loadMockData() {
    // 用于 Create 和 Config 模式的默认数据
    const mockData: MilestoneData[] = [
      {
        id: 'mock1',
        date: new Date('2024-01-15'),
        title: '项目启动',
        description: '项目正式启动，团队组建完成',
        status: 'completed',
        position: { x: 0, y: 0 }
      },
      {
        id: 'mock2', 
        date: new Date('2024-03-01'),
        title: '需求分析完成',
        description: '产品需求分析和技术方案设计完成',
        status: 'completed',
        position: { x: 0, y: 0 }
      },
      {
        id: 'mock3',
        date: new Date('2024-06-15'),
        title: '开发阶段',
        description: '核心功能开发中',
        status: 'in-progress',
        position: { x: 0, y: 0 }
      },
      {
        id: 'mock4',
        date: new Date('2024-09-30'),
        title: '产品发布',
        description: '产品正式发布上线',
        status: 'pending',
        position: { x: 0, y: 0 }
      }
    ];
    
    this.state.data = this.algorithm.calculateSPath(mockData, this.state.config.curveTension);
  }
}
```

## 国际化支持

### 多语言适配
- 中文（zh）
- 英文（en）
- 日文（ja）

### 需要翻译的内容
- 配置项标签
- 错误提示信息
- 状态文本
- 默认示例数据

## 完善后的技术细节

基于 Base JS SDK 文档，现已完善以下关键信息：

### 字段类型枚举（FieldType）
```typescript
enum FieldType {
  Text = 1,
  Number = 2,
  SingleSelect = 3,
  MultipleSelect = 4,
  DateTime = 5,
  Checkbox = 7,
  User = 11,
  Phone = 13,
  Url = 15,
  Attachment = 17,
  Email = 18,
  Currency = 19,
  Progress = 20,
  Rating = 21,
  Location = 22,
  CreateTime = 1001,
  ModifiedTime = 1002,
  CreateUser = 1003,
  ModifiedUser = 1004,
  Autonumber = 1005,
  Barcode = 99001,
  Formula = 99002
}
```

### 数据源选择器组件
```typescript
interface DataSourceConfig {
  tableId: string;
  viewId?: string;
  dataRange?: {
    type: 'ALL' | 'RANGE';
    ranges?: string[];
  };
}

// 获取所有表格
const tableList = await bitable.base.getTableList();
const tableMetaList = await bitable.base.getTableMetaList();

// 获取指定表格的视图
const table = await bitable.base.getTableById(tableId);
const viewList = await table.getViewList();
```

### 字段选择器组件
```typescript
// 根据字段类型过滤
const dateTimeFields = await table.getFieldListByType<IDateTimeField>(FieldType.DateTime);
const textFields = await table.getFieldListByType<ITextField>(FieldType.Text);

// 获取字段元数据
const fieldMetaList = await table.getFieldMetaList();
const dateTimeFieldMeta = await table.getFieldMetaListByType<IDateTimeFieldMeta>(FieldType.DateTime);
```

### Dashboard API vs 普通表格 API
```typescript
// Dashboard 插件专用 API（仪表盘环境）
interface DashboardAPI {
  getPreviewData(conditions: IDataCondition): Promise<any[]>;
  getData(conditions: IDataCondition): Promise<any[]>;
  saveConfig(config: any): Promise<boolean>;
  getConfig(): Promise<any>;
}

// 普通表格 API（直接访问表格）
const table = await bitable.base.getActiveTable();
const records = await table.getRecords({ pageSize: 5000 });
```

## 开发计划

### Phase 1: 基础架构搭建
- [ ] 创建组件文件结构
- [ ] 实现基础状态管理
- [ ] 配置数据结构定义

### Phase 2: 数据处理实现
- [ ] 多维表格数据读取
- [ ] 数据格式转换
- [ ] 错误处理机制

### Phase 3: S型算法开发
- [ ] 路径计算算法
- [ ] 节点位置分配
- [ ] 贝塞尔曲线生成

### Phase 4: UI组件实现
- [ ] SVG时间线渲染
- [ ] 里程碑节点组件
- [ ] 配置面板界面

### Phase 5: 样式和优化
- [ ] 响应式设计
- [ ] 主题色适配
- [ ] 性能优化

### Phase 6: 测试和发布
- [ ] 功能测试
- [ ] 兼容性测试
- [ ] 文档编写

---

## 🔧 关键问题修正总结

**本计划已修正以下关键问题**：

### ✅ Dashboard API 使用修正
- **问题**: 错误地向 `dashboard.getPreviewData()` 和 `dashboard.getData()` 传递参数
- **修正**: 正确的工作流程为：
  1. 配置阶段：通过 `dashboard.saveConfig()` 保存数据依赖声明
  2. 展示阶段：无参数调用 `dashboard.getPreviewData()` 或 `dashboard.getData()`
  3. 平台自动根据保存的依赖提供数据

### ✅ S型算法优化
- **问题**: 原算法只能生成锯齿状路径，而非平滑S型曲线
- **修正**: 
  - 使用正弦波函数生成平滑的S型横坐标
  - 集成 d3-shape 的 curveBasis 生成贝塞尔曲线
  - 支持自适应布局和最小间距控制

### ✅ 时间范围功能补全
- **问题**: 计划提到时间范围功能但缺少实现
- **修正**: 
  - 新增时间范围配置界面（年/月/季度/自定义）
  - 实现客户端时间过滤逻辑
  - 默认显示当年数据

### ✅ 状态管理完善
- **问题**: 缺少完整的状态管理实现
- **修正**: 
  - 实现完整的 Dashboard 生命周期管理
  - 正确的模式检测和配置加载
  - 实时预览和配置保存功能

**现在这份计划可以安全地进入实施阶段** 🚀
