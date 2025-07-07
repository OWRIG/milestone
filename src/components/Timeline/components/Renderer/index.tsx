import React, { useRef, useEffect, useState } from 'react';
import { MilestoneData, STimelineConfig, ContainerSize } from '../../types';
import { STimelineAlgorithm } from '../../utils/sAlgorithm';
import MilestoneCircle from './MilestoneCircle';
import MilestoneCard from './MilestoneCard';
import './style.scss';

interface TimelineRendererProps {
  milestones: MilestoneData[];
  config: STimelineConfig;
  containerSize: ContainerSize;
  onMilestoneClick?: (milestone: MilestoneData) => void;
  className?: string;
}

const TimelineRenderer: React.FC<TimelineRendererProps> = ({
  milestones,
  config,
  containerSize,
  onMilestoneClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pathData, setPathData] = useState<string>('');
  const [processedMilestones, setProcessedMilestones] = useState<MilestoneData[]>([]);
  
  // 创建算法实例
  const algorithm = useRef(new STimelineAlgorithm(containerSize));
  
  // 更新算法容器尺寸
  useEffect(() => {
    algorithm.current.updateContainerSize(containerSize);
  }, [containerSize]);
  
  // 计算横排S型路径和节点位置
  useEffect(() => {
    if (milestones.length === 0) {
      setPathData('');
      setProcessedMilestones([]);
      return;
    }
    
    try {
      // 更新算法配置
      const minSpacing = config.minNodeSpacing || 120;
      algorithm.current.setMinNodeSpacing(minSpacing);
      algorithm.current.setMaxNodeSpacing(200);
      algorithm.current.setRowHeight(140);
      algorithm.current.setMaxNodesPerRow(6);
      
      // 计算横排S型路径
      const calculatedMilestones = algorithm.current.calculateSPath(milestones, minSpacing);
      setProcessedMilestones(calculatedMilestones);
      
      // 生成SVG路径
      const path = algorithm.current.generateSVGPath(calculatedMilestones);
      setPathData(path);
    } catch (error) {
      console.error('计算横排S型路径失败:', error);
      setPathData('');
      setProcessedMilestones([]);
    }
  }, [milestones, config.minNodeSpacing, containerSize]);
  
  // 处理里程碑点击事件
  const handleMilestoneClick = (milestone: MilestoneData) => {
    onMilestoneClick?.(milestone);
  };
  
  // 计算动态高度
  const dynamicHeight = processedMilestones.length > 0 
    ? Math.max(containerSize.height, algorithm.current.calculateRequiredHeight(processedMilestones.length))
    : containerSize.height;

  // 如果没有数据，显示空状态
  if (milestones.length === 0) {
    return (
      <div className={`s-timeline-renderer ${className}`}>
        <div className="empty-state">
          <div className="empty-content">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path 
                d="M32 8C18.745 8 8 18.745 8 32s10.745 24 24 24 24-10.745 24-24S45.255 8 32 8zm0 44c-11.046 0-20-8.954-20-20s8.954-20 20-20 20 8.954 20 20-8.954 20-20 20z" 
                fill="currentColor" 
                opacity="0.3"
              />
              <path 
                d="M32 18v8M32 38v8M22 32h8M42 32h8" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
            <h3>暂无数据</h3>
            <p>请配置数据源和字段映射</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`s-timeline-renderer ${className}`}>
      {/* SVG 容器：负责连接线和节点圆圈 */}
      <svg
        ref={svgRef}
        width={containerSize.width}
        height={dynamicHeight}
        viewBox={`0 0 ${containerSize.width} ${dynamicHeight}`}
        className="s-timeline-svg"
      >
        {/* 定义渐变和滤镜 */}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.lineColor} stopOpacity="0.3" />
            <stop offset="50%" stopColor={config.lineColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={config.completedColor} stopOpacity="1" />
          </linearGradient>
          
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.2)"/>
          </filter>
        </defs>
        
        {/* S型连接线 */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#shadow)"
            className="s-timeline-path"
          />
        )}
        
        {/* 里程碑圆圈节点 */}
        {processedMilestones.map((milestone, index) => (
          <MilestoneCircle
            key={milestone.id || index}
            milestone={milestone}
            config={config}
            onClick={handleMilestoneClick}
            index={index}
          />
        ))}
      </svg>
      
      {/* HTML 容器：负责信息卡片 */}
      <div 
        className="milestone-cards-container"
        style={{
          position: 'relative',
          width: '100%',
          height: dynamicHeight,
          pointerEvents: 'auto', // 允许卡片交互
        }}
      >
        {processedMilestones.map((milestone, index) => (
          <MilestoneCard
            key={`card-${milestone.id || index}`}
            milestone={milestone}
            config={config}
            onClick={handleMilestoneClick}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineRenderer;