import { bitable, FieldType, dashboard } from '@lark-base-open/js-sdk';
import type { IDataCondition } from '@lark-base-open/js-sdk';
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
        // 关键修正：直接提供字段ID列表，而不是使用聚合配置
        fieldIds: [
          this.config.dateField,
          this.config.titleField,
          this.config.descField,
          this.config.statusField
        ].filter(Boolean) // 使用 filter(Boolean) 优雅地移除未配置的空值字段
      };
      
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
          // 配置模式：使用当前配置构建条件
          const dataConditions = {
            tableId: this.config.tableId,
            fieldIds: [
              this.config.dateField,
              this.config.titleField,
              this.config.descField,
              this.config.statusField
            ].filter(Boolean)
          };
          console.log('获取预览数据，条件:', dataConditions);
          rawData = await dashboard.getPreviewData(dataConditions);
          console.log('预览数据结果:', rawData);
        } else {
          // 查看模式：尝试使用相同的逻辑，重建 dataConditions
          console.log('获取完整数据');
          
          // 尝试无参数调用（官方推荐方式）
          rawData = await dashboard.getData();
          console.log('无参数 getData() 结果:', rawData);
          
          // 如果无参数调用失败或返回空数据，尝试重建条件
          if (!rawData || !Array.isArray(rawData) || rawData.length <= 1) {
            console.log('无参数调用失败，尝试重建 dataConditions');
            const dataConditions = {
              tableId: this.config.tableId,
              fieldIds: [
                this.config.dateField,
                this.config.titleField,
                this.config.descField,
                this.config.statusField
              ].filter(Boolean)
            };
            console.log('重建的条件:', dataConditions);
            rawData = await dashboard.getPreviewData(dataConditions);
            console.log('重建条件后的数据:', rawData);
          }
          
          console.log('最终完整数据结果:', rawData);
          console.log('完整数据类型:', typeof rawData, Array.isArray(rawData));
          if (rawData && Array.isArray(rawData)) {
            console.log('数据长度:', rawData.length);
            if (rawData.length > 0) {
              console.log('第一行数据:', rawData[0]);
            }
          }
        }
        
        // 处理获取到的数据
        return await this.processRawData(rawData);
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
  private async processRawData(rawData: any[]): Promise<MilestoneData[]> {
    console.log('processRawData 开始处理数据');
    console.log('当前配置:', this.config);
    console.log('原始数据:', rawData);
    
    if (!Array.isArray(rawData)) {
      console.warn('Dashboard API 返回的数据格式不正确，期望一个数组。');
      return this.getMockData();
    }

    const milestones: MilestoneData[] = [];

    // Dashboard API 返回的是二维数组格式：[[headers], [row1], [row2], ...]
    if (rawData.length < 2) {
      console.warn('Dashboard API 返回的数据为空或只有表头');
      return this.getMockData();
    }

    const headers = rawData[0]; // 第一行是表头
    const dataRows = rawData.slice(1); // 后续行是数据

    console.log('表头:', headers);
    console.log('数据行数:', dataRows.length);

    // 详细检查表头结构
    console.log('表头详细信息:');
    headers.forEach((header: any, index: number) => {
      console.log(`  [${index}]:`, {
        完整对象: header,
        value属性: header.value,
        text属性: header.text,
        其他属性: Object.keys(header)
      });
    });

    console.log('当前配置的字段ID:', {
      dateField: this.config.dateField,
      titleField: this.config.titleField,
      descField: this.config.descField,
      statusField: this.config.statusField
    });

    // 找到字段在表头中的索引
    const dateFieldIndex = headers.findIndex((h: any) => h.value === this.config.dateField);
    const titleFieldIndex = headers.findIndex((h: any) => h.value === this.config.titleField);
    const descFieldIndex = this.config.descField ? headers.findIndex((h: any) => h.value === this.config.descField) : -1;
    const statusFieldIndex = this.config.statusField ? headers.findIndex((h: any) => h.value === this.config.statusField) : -1;

    console.log('字段索引查找结果:', {
      dateFieldIndex,
      titleFieldIndex,
      descFieldIndex,
      statusFieldIndex
    });

    // 如果找不到字段，尝试其他可能的匹配方式
    if (dateFieldIndex === -1 || titleFieldIndex === -1) {
      console.log('尝试其他字段匹配方式...');
      
      // 尝试通过 fieldId 属性匹配
      const dateFieldIndex2 = headers.findIndex((h: any) => h.fieldId === this.config.dateField);
      const titleFieldIndex2 = headers.findIndex((h: any) => h.fieldId === this.config.titleField);
      
      console.log('通过 fieldId 匹配结果:', {
        dateFieldIndex2,
        titleFieldIndex2
      });
      
      // 尝试通过 id 属性匹配
      const dateFieldIndex3 = headers.findIndex((h: any) => h.id === this.config.dateField);
      const titleFieldIndex3 = headers.findIndex((h: any) => h.id === this.config.titleField);
      
      console.log('通过 id 匹配结果:', {
        dateFieldIndex3,
        titleFieldIndex3
      });
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      console.log(`处理第 ${i} 行数据:`, row);

      try {
        // 检查必要字段是否存在
        if (dateFieldIndex < 0 || titleFieldIndex < 0) {
          console.warn('缺少必要字段索引');
          continue;
        }

        if (!row[dateFieldIndex] || !row[titleFieldIndex]) {
          console.warn('行数据缺少必要字段值');
          continue;
        }

        // 获取日期
        const dateCell = row[dateFieldIndex];
        const dateValue = new Date(dateCell.value || dateCell);
        if (isNaN(dateValue.getTime())) {
          console.warn('无效日期:', dateCell);
          continue;
        }

        // 获取标题
        const titleCell = row[titleFieldIndex];
        const titleValue = titleCell.text || titleCell.value || String(titleCell);
        if (!titleValue) {
          console.warn('无效标题:', titleCell);
          continue;
        }

        // 获取描述
        let descriptionValue: string | undefined = undefined;
        if (descFieldIndex >= 0 && row[descFieldIndex]) {
          const descCell = row[descFieldIndex];
          descriptionValue = descCell.text || descCell.value || String(descCell);
        }

        // 获取状态
        let statusValue = 'pending';
        if (statusFieldIndex >= 0 && row[statusFieldIndex]) {
          const statusCell = row[statusFieldIndex];
          statusValue = statusCell.text || statusCell.value || String(statusCell) || 'pending';
        }

        milestones.push({
          id: `milestone_${i}`,
          date: dateValue,
          title: titleValue,
          description: descriptionValue,
          status: statusValue as any,
          completed: statusValue.toLowerCase() === 'completed' || statusValue === '已完成',
          x: 0,
          y: 0
        });

        console.log(`成功处理第 ${i} 行，生成里程碑:`, milestones[milestones.length - 1]);

      } catch (error) {
        console.warn(`处理第 ${i} 行时出错:`, error, row);
      }
    }

    if (milestones.length === 0 && rawData.length > 1) {
      console.warn("成功获取数据但未能解析出任何里程碑，请检查字段配置。");
      return []; // 返回空数组而不是模拟数据，以便UI显示空状态
    }
    
    if (milestones.length === 0) {
       return this.getMockData();
    }

    console.log('成功处理的里程碑数据:', milestones);
    
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