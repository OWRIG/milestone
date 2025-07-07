import React, { useMemo } from 'react';
import { MilestoneData, STimelineConfig, ContainerSize } from '../../types';
import './style.scss';

interface TimelineRendererProps {
  milestones: MilestoneData[];
  config: STimelineConfig;
  containerSize: ContainerSize;
  onMilestoneClick?: (milestone: MilestoneData) => void;
}

const TimelineRenderer: React.FC<TimelineRendererProps> = ({
  milestones,
  config,
  containerSize,
  onMilestoneClick
}) => {
  // S 型横向布局计算
  const processedMilestones = useMemo(() => {
    if (milestones.length === 0) return [];

    const padding = 80; // 增加四周边距
    const availableWidth = containerSize.width - (padding * 2);
    const nodeSpacing = config.minNodeSpacing || 200;
    const rowHeight = 160; // 增加行高，为描述文字留出更多空间
    const nodesPerRow = Math.max(1, Math.floor(availableWidth / nodeSpacing));
    
    return milestones.map((milestone, index) => {
      const rowIndex = Math.floor(index / nodesPerRow);
      const colIndex = index % nodesPerRow;
      
      // S 型布局：奇数行从右到左，偶数行从左到右
      const isOddRow = rowIndex % 2 === 1;
      const actualColIndex = isOddRow ? (nodesPerRow - 1 - colIndex) : colIndex;
      
      const x = padding + (actualColIndex * nodeSpacing);
      const y = 120 + (rowIndex * rowHeight); // 从上方留出更多空间
      
      return {
        ...milestone,
        x,
        y
      };
    });
  }, [milestones, containerSize, config.minNodeSpacing]);

  // 生成简单的 S 型连接线路径
  const linePath = useMemo(() => {
    if (processedMilestones.length < 2) return '';

    const pathParts: string[] = [];
    const padding = 80;
    const availableWidth = containerSize.width - (padding * 2);
    const nodeSpacing = config.minNodeSpacing || 200;
    const nodesPerRow = Math.max(1, Math.floor(availableWidth / nodeSpacing));
    
    processedMilestones.forEach((milestone, index) => {
      if (index === 0) {
        pathParts.push(`M ${milestone.x} ${milestone.y}`);
      } else {
        const prevMilestone = processedMilestones[index - 1];
        
        // 如果是同一行，直接连接
        if (Math.abs(milestone.y - prevMilestone.y) < 10) {
          pathParts.push(`L ${milestone.x} ${milestone.y}`);
        } else {
          // 换行时使用真正的半圆弧，形成 S 型
          const prevRowIndex = Math.floor((index - 1) / nodesPerRow);
          const currentRowIndex = Math.floor(index / nodesPerRow);
          
          const deltaY = Math.abs(milestone.y - prevMilestone.y);
          const radius = deltaY / 2;
          
          // 根据行数确定弧的方向，形成真正的 S 型
          // 偶数行到奇数行：向右弯曲 (sweepFlag = 1)
          // 奇数行到偶数行：向左弯曲 (sweepFlag = 0)
          const sweepFlag = (prevRowIndex % 2 === 0) ? 1 : 0;
          const largeArcFlag = 0; // 小弧
          
          pathParts.push(
            `A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${milestone.x} ${milestone.y}`
          );
        }
      }
    });

    return pathParts.join(' ');
  }, [processedMilestones, containerSize.width, config.minNodeSpacing]);

  // 获取状态颜色
  const getStatusColor = (milestone: MilestoneData) => {
    if (milestone.completed || milestone.status === 'completed') {
      return '#4CAF50'; // 绿色 - 完成
    } else if (milestone.status === 'in-progress') {
      return '#FFC107'; // 黄色 - 进行中  
    } else {
      return '#F44336'; // 红色 - 未开始
    }
  };

  // 处理点击事件
  const handleMilestoneClick = (milestone: MilestoneData) => {
    onMilestoneClick?.(milestone);
  };

  if (milestones.length === 0) {
    return (
      <div className="s-timeline-renderer">
        <div className="empty-state">
          <div className="empty-content">
            <h3>暂无数据</h3>
            <p>请配置数据源和字段映射</p>
          </div>
        </div>
      </div>
    );
  }

  // 计算实际需要的高度
  const requiredHeight = useMemo(() => {
    if (processedMilestones.length === 0) return containerSize.height;
    
    const maxY = Math.max(...processedMilestones.map(m => m.y));
    return Math.max(containerSize.height, maxY + 200); // 底部留出更多空间给描述文字
  }, [processedMilestones, containerSize.height]);

  return (
    <div className="s-timeline-renderer">
      <svg
        width={containerSize.width}
        height={requiredHeight}
        viewBox={`0 0 ${containerSize.width} ${requiredHeight}`}
        className="s-timeline-svg"
      >
        {/* 连接线 */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={config.lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="s-timeline-path"
          />
        )}

        {/* 里程碑节点 */}
        {processedMilestones.map((milestone, index) => {
          const statusColor = getStatusColor(milestone);
          
          return (
            <g key={milestone.id} className="milestone-group">
              {/* 节点圆圈 */}
              <circle
                cx={milestone.x}
                cy={milestone.y}
                r={config.nodeSize}
                fill={statusColor}
                stroke="white"
                strokeWidth="3"
                className="milestone-circle"
                style={{ cursor: 'pointer' }}
                onClick={() => handleMilestoneClick(milestone)}
              />
              
              {/* 日期标签 */}
              <text
                x={milestone.x}
                y={milestone.y - config.nodeSize - 10}
                textAnchor="middle"
                fontSize="12"
                fill="var(--semi-color-text-1)"
                className="milestone-date"
              >
                {milestone.date.toLocaleDateString('zh-CN', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </text>
              
              {/* 标题 */}
              <text
                x={milestone.x}
                y={milestone.y + config.nodeSize + 20}
                textAnchor="middle"
                fontSize="14"
                fontWeight="500"
                fill="var(--semi-color-text-0)"
                className="milestone-title"
                style={{ cursor: 'pointer' }}
                onClick={() => handleMilestoneClick(milestone)}
              >
                {milestone.title}
              </text>
              
              {/* 描述 */}
              {config.showDescription && milestone.description && (
                <text
                  x={milestone.x}
                  y={milestone.y + config.nodeSize + 55}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--semi-color-text-2)"
                  className="milestone-description"
                  style={{ maxWidth: '120px' }}
                >
                  {milestone.description.length > 20 
                    ? milestone.description.substring(0, 20) + '...' 
                    : milestone.description}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default TimelineRenderer;