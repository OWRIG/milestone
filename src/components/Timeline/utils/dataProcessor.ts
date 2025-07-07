import { bitable, FieldType, dashboard } from '@lark-base-open/js-sdk';
import type { IDataCondition } from '@lark-base-open/js-sdk';
import { MilestoneData, STimelineConfig, DashboardMode } from '../types';

// Dashboard API类型定义
type IDataItem = {
  value: string | number | null;
  text: string | null;
  groupKey?: string;
};

type IData = IDataItem[][];

// 时间线数据管理器
export class TimelineDataManager {
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
        dataRange: { type: 'ALL' },
        groups: this.config.dateField ? [{ fieldId: this.config.dateField }] : [],
        series: this.config.titleField ? [{ fieldId: this.config.titleField, rollup: 'COUNTA' }] : 'COUNTA'
      } as any;
      
      const configToSave = {
        dataConditions: [dataConditions],
        customConfig: this.config as Record<string, unknown>
      };
      
      return await dashboard.saveConfig(configToSave) || false;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }
  
  // 步骤 2: 展示阶段 - 获取数据（正确方式）
  async loadTimelineData(): Promise<MilestoneData[]> {
    try {
      let rawData: any[];
      
      // 检查是否在仪表盘环境中
      if (typeof dashboard !== 'undefined') {
        if (this.mode === DashboardMode.Config) {
          // 配置模式：使用预览数据
          const dataConditions = {
            tableId: this.config.tableId,
            dataRange: { type: 'ALL' },
            groups: this.config.dateField ? [{ fieldId: this.config.dateField }] : [],
            series: this.config.titleField ? [{ fieldId: this.config.titleField, rollup: 'COUNTA' }] : 'COUNTA'
          } as any;
          rawData = await dashboard.getPreviewData(dataConditions);
        } else {
          // 查看模式：使用完整数据
          rawData = await dashboard.getData();
        }
        
        // 处理获取到的数据
        return this.processRawData(rawData);
      } else {
        // 降级到直接表格访问
        return this.loadDataFromTable();
      }
    } catch (error) {
      console.error('数据加载失败:', error);
      // 降级到直接表格访问
      return this.loadDataFromTable();
    }
  }
  
  // 处理从 Dashboard API 获取的数据
  private processRawData(rawData: IData): MilestoneData[] {
    const milestones: MilestoneData[] = [];
    
    if (!Array.isArray(rawData)) {
      console.warn('Dashboard API 返回的数据格式不正确');
      return this.getMockData();
    }
    
    // Dashboard API 返回的是二维数组格式，需要转换为时间线数据
    // 第一行是表头，后续行是数据
    if (rawData.length <= 1) {
      console.warn('Dashboard API 返回的数据为空');
      return this.getMockData();
    }
    
    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    
    dataRows.forEach((row, index) => {
      try {
        // 根据配置的字段映射提取数据
        const dateFieldIndex = headers.findIndex((h: IDataItem) => h.value === this.config.dateField);
        const titleFieldIndex = headers.findIndex((h: IDataItem) => h.value === this.config.titleField);
        const descFieldIndex = this.config.descField ? headers.findIndex((h: IDataItem) => h.value === this.config.descField) : -1;
        const statusFieldIndex = this.config.statusField ? headers.findIndex((h: IDataItem) => h.value === this.config.statusField) : -1;
        
        if (dateFieldIndex >= 0 && titleFieldIndex >= 0 && row[dateFieldIndex] && row[titleFieldIndex]) {
          const dateValue = row[dateFieldIndex].value;
          const titleValue = row[titleFieldIndex];
          
          // Dashboard API 返回的数据结构：使用 text 字段作为显示文本
          const title = titleValue && titleValue.text ? titleValue.text : String(titleValue.value || '');
          if (!title) return;
          
          // 安全地处理日期字段
          const date = new Date(dateValue as any);
          if (isNaN(date.getTime())) return;
          
          // 安全地处理描述字段
          const description = descFieldIndex >= 0 && row[descFieldIndex] ? 
            (row[descFieldIndex].text || String(row[descFieldIndex].value || '')) : undefined;
          
          // 安全地处理状态字段
          const statusItem = statusFieldIndex >= 0 && row[statusFieldIndex] ? row[statusFieldIndex] : null;
          const status = statusItem ? (statusItem.text || String(statusItem.value || 'pending')) : 'pending';
          
          milestones.push({
            id: `milestone_${index}`,
            date,
            title,
            description,
            status: status as any,
            completed: status === 'completed' || status === '已完成',
            x: 0,
            y: 0
          });
        }
      } catch (error) {
        console.warn(`处理记录 ${index} 时出错:`, error);
      }
    });
    
    // 如果没有获取到有效数据，返回模拟数据
    if (milestones.length === 0) {
      return this.getMockData();
    }
    
    // 按日期排序并应用时间过滤
    return this.applyTimeFilter(milestones.sort((a, b) => a.date.getTime() - b.date.getTime()));
  }
  
  // 降级方案：直接从表格获取数据
  private async loadDataFromTable(): Promise<MilestoneData[]> {
    try {
      if (!this.config.tableId || !this.config.dateField || !this.config.titleField) {
        return this.getMockData();
      }
      
      const table = await bitable.base.getTableById(this.config.tableId);
      const records = await table.getRecords({ pageSize: 5000 });
      
      const milestones: MilestoneData[] = [];
      
      for (const record of records.records) {
        try {
          const dateValue = record.fields[this.config.dateField];
          const titleValue = record.fields[this.config.titleField];
          
          if (!dateValue || !titleValue) continue;
          
          // 使用 getCellString 安全地获取标题文本
          const title = await table.getCellString(this.config.titleField, record.recordId);
          if (!title) continue;
          
          // 处理日期字段 - 直接使用字段值，因为日期通常是时间戳
          const date = new Date(dateValue as any);
          if (isNaN(date.getTime())) continue;
          
          // 使用 getCellString 安全地获取描述文本
          const description = this.config.descField ? 
            await table.getCellString(this.config.descField, record.recordId) : undefined;
          
          // 使用 getCellString 安全地获取状态文本
          const status = this.config.statusField ? 
            await table.getCellString(this.config.statusField, record.recordId) || 'pending' : 'pending';
          
          milestones.push({
            id: record.recordId,
            date,
            title,
            description: description || undefined,
            status: status as any,
            completed: status === 'completed' || status === '已完成',
            x: 0,
            y: 0
          });
        } catch (error) {
          console.warn('处理单条记录失败:', record, error);
          continue;
        }
      }
      
      return this.applyTimeFilter(milestones.sort((a, b) => a.date.getTime() - b.date.getTime()));
    } catch (error) {
      console.error('表格数据加载失败:', error);
      // 返回模拟数据作为最后的降级方案
      return this.getMockData();
    }
  }
  
  
  // 时间范围过滤功能
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
  
  // 获取模拟数据
  public getMockData(): MilestoneData[] {
    const currentYear = new Date().getFullYear();
    return [
      {
        id: 'mock1',
        date: new Date(currentYear, 0, 15), // 1月15日
        title: '项目启动',
        description: '项目正式启动，团队组建完成',
        status: 'completed',
        completed: true,
        x: 0,
        y: 0
      },
      {
        id: 'mock2', 
        date: new Date(currentYear, 2, 1), // 3月1日
        title: '需求分析完成',
        description: '产品需求分析和技术方案设计完成',
        status: 'completed',
        completed: true,
        x: 0,
        y: 0
      },
      {
        id: 'mock3',
        date: new Date(currentYear, 5, 15), // 6月15日
        title: '开发阶段',
        description: '核心功能开发中',
        status: 'in-progress',
        completed: false,
        x: 0,
        y: 0
      },
      {
        id: 'mock4',
        date: new Date(currentYear, 8, 30), // 9月30日
        title: '产品发布',
        description: '产品正式发布上线',
        status: 'pending',
        completed: false,
        x: 0,
        y: 0
      }
    ];
  }
  
  // 更新配置
  updateConfig(config: STimelineConfig): void {
    this.config = config;
  }
  
  // 更新模式
  updateMode(mode: DashboardMode): void {
    this.mode = mode;
  }
}