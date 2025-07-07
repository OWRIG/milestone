import { bitable, FieldType } from '@lark-base-open/js-sdk';
import { MilestoneData, STimelineConfig, DashboardMode } from '../types';

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
      
      // 注意：这里需要根据实际的 dashboard API 调整
      // @ts-ignore - dashboard 对象在仪表盘环境中可用
      return await window.dashboard?.saveConfig(configToSave) || false;
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
      // @ts-ignore - dashboard 对象在仪表盘环境中可用
      if (typeof window.dashboard !== 'undefined') {
        if (this.mode === DashboardMode.Config) {
          // 配置模式：使用预览数据（无参数）
          // @ts-ignore
          rawData = await window.dashboard.getPreviewData();
        } else {
          // 查看模式：使用完整数据（无参数）
          // @ts-ignore
          rawData = await window.dashboard.getData();
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
  private processRawData(rawData: any[]): MilestoneData[] {
    const milestones: MilestoneData[] = [];
    
    if (!Array.isArray(rawData)) {
      console.warn('Dashboard API 返回的数据格式不正确');
      return [];
    }
    
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
            completed: this.config.statusField ? record[this.config.statusField] === 'completed' : false,
            x: 0,
            y: 0
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
      if (!this.config.tableId || !this.config.dateField || !this.config.titleField) {
        return this.getMockData();
      }
      
      const table = await bitable.base.getTableById(this.config.tableId);
      const records = await table.getRecords({ pageSize: 5000 });
      
      const milestones: MilestoneData[] = [];
      
      for (const record of records.records) {
        const dateValue = record.fields[this.config.dateField];
        const titleValue = record.fields[this.config.titleField];
        
        if (dateValue && titleValue) {
          milestones.push({
            id: record.recordId,
            date: new Date(dateValue as any),
            title: String(titleValue),
            description: this.config.descField ? String(record.fields[this.config.descField] || '') : undefined,
            status: this.config.statusField ? record.fields[this.config.statusField] as any : 'pending',
            completed: this.config.statusField ? record.fields[this.config.statusField] === 'completed' : false,
            x: 0,
            y: 0
          });
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
  private getMockData(): MilestoneData[] {
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