import React, { useState, useEffect, useCallback } from 'react';
import { dashboard } from '@lark-base-open/js-sdk';
import TimelineRenderer from './components/Renderer';
import ConfigPanel from './components/ConfigPanel';
import { STimelineConfig, MilestoneData, DashboardMode } from './types';
import { TimelineDataManager } from './utils/dataProcessor';
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
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<DashboardMode>(mode);
  const [actualContainerSize, setActualContainerSize] = useState(containerSize);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const resizeObserverRef = React.useRef<ResizeObserver>();

  // 检测当前运行模式
  const detectMode = useCallback(async (): Promise<DashboardMode> => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('mode');
      
      switch (urlMode) {
        case 'config': return DashboardMode.Config;
        case 'view': return DashboardMode.View;
        case 'fullscreen': return DashboardMode.FullScreen;
        default: return DashboardMode.Create;
      }
    } catch (error) {
      console.warn('检测模式失败，使用默认模式');
      return DashboardMode.Create;
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async (configToUse: STimelineConfig, modeToUse: DashboardMode) => {
    setLoading(true);
    try {
      const dataManager = new TimelineDataManager(configToUse, modeToUse);
      
      // 根据模式决定使用哪种数据加载方式
      let data: MilestoneData[];
      if (modeToUse === DashboardMode.View || modeToUse === DashboardMode.FullScreen) {
        // 展示模式：使用 getData 获取完整数据
        data = await dataManager.loadTimelineData();
      } else {
        // 创建/配置模式：如果没有配置表格，使用 mock 数据；否则使用 getPreviewData
        if (!configToUse.tableId) {
          data = getMockData();
        } else {
          data = await dataManager.loadTimelineData();
        }
      }
      
      setMilestones(data);
    } catch (error) {
      console.error('加载数据失败:', error);
      // 降级到 mock 数据
      setMilestones(getMockData());
    } finally {
      setLoading(false);
    }
  }, []);

  // 配置变更处理 - 实时预览
  const handleConfigChange = useCallback(async (newConfig: STimelineConfig) => {
    console.log('Config change:', newConfig);
    setConfig(newConfig);
    
    // 如果在配置模式下，立即更新预览
    if (currentMode === DashboardMode.Config || currentMode === DashboardMode.Create) {
      await loadData(newConfig, currentMode);
    }
  }, [currentMode, loadData]);

  // 保存配置
  const handleSave = useCallback(async () => {
    try {
      const dataManager = new TimelineDataManager(config, currentMode);
      const success = await dataManager.saveDataDependency();
      if (success) {
        console.log('配置保存成功');
        // 保存后重新加载数据
        await loadData(config, currentMode);
      }
      return success;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }, [config, currentMode, loadData]);

  // 初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        const detectedMode = await detectMode();
        setCurrentMode(detectedMode);
        
        // 尝试加载已保存的配置
        if (detectedMode === DashboardMode.View || detectedMode === DashboardMode.FullScreen) {
          try {
            const savedConfig = await dashboard.getConfig();
            if (savedConfig?.customConfig) {
              const newConfig = { ...getDefaultConfig(), ...savedConfig.customConfig };
              setConfig(newConfig);
              await loadData(newConfig, detectedMode);
              return;
            }
          } catch (error) {
            console.warn('加载保存的配置失败:', error);
          }
        }
        
        // 使用默认配置加载数据
        await loadData(config, detectedMode);
      } catch (error) {
        console.error('初始化失败:', error);
        setMilestones(getMockData());
      }
    };
    
    initialize();
  }, [detectMode, loadData, config]);

  // 监听数据变化
  useEffect(() => {
    const cleanup = dashboard.onDataChange(async () => {
      if (currentMode === DashboardMode.View || currentMode === DashboardMode.FullScreen) {
        await loadData(config, currentMode);
      }
    });
    
    return cleanup;
  }, [config, currentMode, loadData]);

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newSize = { width: rect.width, height: rect.height };
        
        // 只有在尺寸真正发生变化时才更新
        if (Math.abs(newSize.width - actualContainerSize.width) > 5 || 
            Math.abs(newSize.height - actualContainerSize.height) > 5) {
          setActualContainerSize(newSize);
        }
      }
    };

    // 初始化尺寸
    updateSize();

    // 创建 ResizeObserver
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    // 监听窗口大小变化作为备用
    const handleResize = () => updateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [actualContainerSize]);

  // 更新外部传入的容器大小
  useEffect(() => {
    setActualContainerSize(containerSize);
  }, [containerSize]);

  const isConfigMode = currentMode === DashboardMode.Config || currentMode === DashboardMode.Create;

  return (
    <div ref={containerRef} className={`s-timeline-dashboard mode-${currentMode}`}>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">加载中...</div>
        </div>
      )}
      
      {isConfigMode ? (
        // 配置模式：左侧预览，右侧配置
        <div className="config-layout">
          <div className="timeline-preview">
            <TimelineRenderer 
              milestones={milestones}
              config={config}
              containerSize={{
                width: containerSize.width, // 减去固定配置面板宽度
                height: containerSize.height
              }}
            />
          </div>
          <div className="config-panel-wrapper">
            <ConfigPanel 
              config={config}
              onConfigChange={handleConfigChange}
              onSave={handleSave}
              loading={loading}
            />
          </div>
        </div>
      ) : (
        // 查看模式：全屏显示
        <div className="view-layout">
          <TimelineRenderer 
            milestones={milestones}
            config={config}
            containerSize={actualContainerSize}
          />
        </div>
      )}
    </div>
  );
};

export default TimelineDashboard;