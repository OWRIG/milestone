import React, { useState, useEffect, useRef, useCallback } from 'react';
import { bitable } from '@lark-base-open/js-sdk';
import { DashboardState, DashboardMode, STimelineConfig, MilestoneData, ContainerSize, STimelineProps } from './types';
import { STimelineAlgorithm } from './utils/sAlgorithm';
import { TimelineDataManager } from './utils/dataProcessor';
import ConfigPanel from './components/ConfigPanel';
import TimelineRenderer from './components/Renderer';
import './style.scss';

// S型时间线仪表盘主组件
const TimelineDashboard: React.FC<STimelineProps> = ({ 
  containerSize, 
  onConfigChange,
  onSave 
}) => {
  const [state, setState] = useState<DashboardState>({
    mode: DashboardMode.Create,
    config: getDefaultConfig(),
    data: [],
    loading: false,
    error: null
  });
  
  const algorithmRef = useRef<STimelineAlgorithm>(new STimelineAlgorithm(containerSize));
  const dataManagerRef = useRef<TimelineDataManager>(new TimelineDataManager(state.config, state.mode));
  
  // 获取默认配置
  function getDefaultConfig(): STimelineConfig {
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
  
  // 检测运行模式
  const detectMode = useCallback(async (): Promise<DashboardMode> => {
    try {
      const env = await bitable.bridge.getEnv();
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
  }, []);
  
  // 加载已保存的配置和数据
  const loadSavedConfigAndData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // 尝试加载已保存的配置
      // @ts-ignore - dashboard 对象在仪表盘环境中可用
      const savedConfig = await window.dashboard?.getConfig?.();
      if (savedConfig?.customConfig) {
        const newConfig = { ...getDefaultConfig(), ...savedConfig.customConfig };
        setState(prev => ({ ...prev, config: newConfig }));
        dataManagerRef.current.updateConfig(newConfig);
        onConfigChange?.(newConfig);
      }
      
      // 加载数据
      const data = await dataManagerRef.current.loadTimelineData();
      const processedData = algorithmRef.current.calculateSPath(data, state.config.curveTension);
      setState(prev => ({ ...prev, data: processedData }));
    } catch (error) {
      console.error('加载数据失败:', error);
      setState(prev => ({ ...prev, error: '加载数据失败' }));
      // 降级到模拟数据
      await loadMockData();
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.config.curveTension, onConfigChange]);
  
  // 加载模拟数据
  const loadMockData = useCallback(async () => {
    const mockData = await dataManagerRef.current.loadTimelineData();
    const processedData = algorithmRef.current.calculateSPath(mockData, state.config.curveTension);
    setState(prev => ({ ...prev, data: processedData }));
  }, [state.config.curveTension]);
  
  // 配置变更处理
  const handleConfigChange = useCallback(async (newConfig: STimelineConfig) => {
    setState(prev => ({ ...prev, config: newConfig }));
    dataManagerRef.current.updateConfig(newConfig);
    onConfigChange?.(newConfig);
    
    // 实时预览（仅在配置模式下）
    if (state.mode === DashboardMode.Config) {
      try {
        setState(prev => ({ ...prev, loading: true }));
        const data = await dataManagerRef.current.loadTimelineData();
        const processedData = algorithmRef.current.calculateSPath(data, newConfig.curveTension);
        setState(prev => ({ ...prev, data: processedData }));
      } catch (error) {
        console.error('预览数据失败:', error);
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [state.mode, onConfigChange]);
  
  // 保存配置
  const handleSave = useCallback(async (): Promise<boolean> => {
    try {
      const success = await dataManagerRef.current.saveDataDependency();
      if (success && onSave) {
        return await onSave();
      }
      return success;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  }, [onSave]);
  
  // 初始化
  useEffect(() => {
    const initialize = async () => {
      try {
        const mode = await detectMode();
        setState(prev => ({ ...prev, mode }));
        dataManagerRef.current.updateMode(mode);
        
        if (mode === DashboardMode.View || mode === DashboardMode.FullScreen) {
          await loadSavedConfigAndData();
        } else {
          await loadMockData();
        }
      } catch (error) {
        console.error('初始化失败:', error);
        setState(prev => ({ ...prev, error: '初始化失败' }));
        await loadMockData();
      }
    };
    
    initialize();
  }, [detectMode, loadSavedConfigAndData, loadMockData]);
  
  // 容器尺寸变化时更新算法
  useEffect(() => {
    algorithmRef.current.updateContainerSize(containerSize);
    if (state.data.length > 0) {
      const processedData = algorithmRef.current.calculateSPath(state.data, state.config.curveTension);
      setState(prev => ({ ...prev, data: processedData }));
    }
  }, [containerSize, state.config.curveTension, state.data]);
  
  // 渲染错误状态
  if (state.error) {
    return (
      <div className="s-timeline-error">
        <div className="error-content">
          <h3>加载失败</h3>
          <p>{state.error}</p>
          <button onClick={() => window.location.reload()}>重新加载</button>
        </div>
      </div>
    );
  }
  
  // 根据模式渲染不同的布局
  const isConfigMode = state.mode === DashboardMode.Config;
  const showConfig = state.mode === DashboardMode.Create || state.mode === DashboardMode.Config;
  
  return (
    <div className={`s-timeline-dashboard mode-${state.mode}`}>
      {isConfigMode ? (
        // 配置模式：左右布局
        <div className="config-layout">
          <div className="config-panel-wrapper">
            <ConfigPanel 
              config={state.config}
              onConfigChange={handleConfigChange}
              loading={state.loading}
            />
            {onSave && (
              <div className="config-actions">
                <button 
                  className="save-button"
                  onClick={handleSave}
                  disabled={state.loading || !state.config.tableId}
                >
                  {state.loading ? '保存中...' : '保存配置'}
                </button>
              </div>
            )}
          </div>
          <div className="timeline-preview">
            <TimelineRenderer 
              milestones={state.data}
              config={state.config}
              containerSize={containerSize}
            />
          </div>
        </div>
      ) : (
        // 查看模式：全屏显示
        <div className="view-layout">
          {showConfig && (
            <div className="config-overlay">
              <ConfigPanel 
                config={state.config}
                onConfigChange={handleConfigChange}
                loading={state.loading}
              />
            </div>
          )}
          <TimelineRenderer 
            milestones={state.data}
            config={state.config}
            containerSize={containerSize}
          />
        </div>
      )}
      
      {state.loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">加载中...</div>
        </div>
      )}
    </div>
  );
};

export default TimelineDashboard;