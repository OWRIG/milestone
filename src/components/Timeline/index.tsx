import React, { useState } from 'react';
import TimelineRenderer from './components/Renderer';
import ConfigPanel from './components/ConfigPanel';
import { STimelineConfig, MilestoneData, DashboardMode } from './types';
import './style.scss';

// 真实业务里程碑数据
const getMockData = (): MilestoneData[] => {
  return [
    {
      id: '1',
      date: new Date(2025, 0, 31),
      title: '全栈开发能力建设完成',
      description: '实现框架全栈支持和多变体业务分发，打通前后端开发壁垒',
      status: 'completed',
      completed: true,
      x: 0, y: 0
    },
    {
      id: '2',
      date: new Date(2025, 1, 28),
      title: '前端部署架构优化完成',
      description: '实现前端网关和应用分发优化，支持大客户定制和私有化部署',
      status: 'completed',
      completed: true,
      x: 0, y: 0
    },
    {
      id: '3',
      date: new Date(2025, 2, 31),
      title: 'AI能力集成里程碑',
      description: '框架集成图片理解和数据分析AI能力，支持非结构化数据处理',
      status: 'in-progress',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '4',
      date: new Date(2025, 3, 30),
      title: '前端监控体系建设完成',
      description: '建立完整的前端应用监控和错误边界机制，实现客户问题快速定位和处理',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '5',
      date: new Date(2025, 4, 31),
      title: '后端服务稳定性全面提升',
      description: '完成框架后端稳定性升级改造，解决服务重启和报错问题',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '6',
      date: new Date(2025, 5, 30),
      title: '微服务架构升级完成',
      description: '完成限流熔断组件和Redis集群模式实现',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '7',
      date: new Date(2025, 6, 31),
      title: '移动端开发效率提升',
      description: '完成APP热更新和H5开发能力建设',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '8',
      date: new Date(2025, 7, 31),
      title: '统一数据服务平台建设',
      description: '完成统一指标服务和数据采集能力建设',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '9',
      date: new Date(2025, 8, 30),
      title: '框架知识产权保护',
      description: '完成数据服务平台专利申请，建立技术护城河',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '10',
      date: new Date(2025, 9, 31),
      title: '开发工具链现代化',
      description: '完成AI编程工具推广和前端构建工具升级',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '11',
      date: new Date(2025, 10, 30),
      title: '监控运维体系完善',
      description: '建立完整的服务监控和性能监控体系',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '12',
      date: new Date(2025, 11, 31),
      title: '充电桩生态扩展',
      description: '开放平台支持充电桩厂商接入，扩展新能源生态',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '13',
      date: new Date(2026, 2, 31),
      title: '数据链路可视化平台建设',
      description: '完成完整链路数据可视化平台建设',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '14',
      date: new Date(2026, 5, 30),
      title: '云原生架构全面升级',
      description: '建立基于容器化和微服务的云原生技术体系，实现弹性扩缩和快速部署',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '15',
      date: new Date(2026, 8, 30),
      title: '数字孪生技术平台建设',
      description: '构建新能源设备数字孪生平台，实现设备状态实时监控和预测性维护',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    },
    {
      id: '16',
      date: new Date(2026, 11, 31),
      title: '技术栈现代化升级',
      description: '完成React19、Node22等核心技术栈升级和3D可视化能力建设',
      status: 'pending',
      completed: false,
      x: 0, y: 0
    }
  ];
};

// 简化的默认配置 - 只保留必要的配置项
const getDefaultConfig = (): STimelineConfig => ({
  tableId: '',
  dateField: '',
  titleField: '',
  descField: '',
  statusField: '',
  timeRange: {
    startDate: new Date(2025, 0, 1),  // 2025年1月1日
    endDate: new Date(2026, 11, 31),  // 2026年12月31日
    autoRange: 'custom'
  },
  nodeColor: '#1890ff',
  lineColor: '#d9d9d9',
  completedColor: '#52c41a',
  curveTension: 0.5,
  nodeSize: 12,
  showDescription: true,
  adaptiveLayout: true,
  minNodeSpacing: 200  // 增加默认节点间距
});

interface TimelineDashboardProps {
  containerSize?: { width: number; height: number };
  mode?: DashboardMode;
}

const TimelineDashboard: React.FC<TimelineDashboardProps> = ({ 
  containerSize = { width: 1200, height: 600 },
  mode = DashboardMode.Config
}) => {
  const [config, setConfig] = useState<STimelineConfig>(getDefaultConfig());
  const [milestones] = useState<MilestoneData[]>(getMockData());

  const handleConfigChange = (newConfig: STimelineConfig) => {
    setConfig(newConfig);
  };

  const isConfigMode = mode === DashboardMode.Config || mode === DashboardMode.Create;

  return (
    <div className={`s-timeline-dashboard mode-${mode}`}>
      {isConfigMode ? (
        // 配置模式：左侧预览，右侧配置
        <div className="config-layout">
          <div className="timeline-preview">
            <TimelineRenderer 
              milestones={milestones}
              config={config}
              containerSize={{
                width: containerSize.width - 350, // 减去固定配置面板宽度
                height: containerSize.height
              }}
            />
          </div>
          <div className="config-panel-wrapper">
            <ConfigPanel 
              config={config}
              onConfigChange={handleConfigChange}
              loading={false}
            />
          </div>
        </div>
      ) : (
        // 查看模式：全屏显示
        <div className="view-layout">
          <TimelineRenderer 
            milestones={milestones}
            config={config}
            containerSize={containerSize}
          />
        </div>
      )}
    </div>
  );
};

export default TimelineDashboard;