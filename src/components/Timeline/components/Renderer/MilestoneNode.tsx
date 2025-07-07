import React, { useState } from 'react';
import { MilestoneData, STimelineConfig } from '../../types';

interface MilestoneNodeProps {
  milestone: MilestoneData;
  config: STimelineConfig;
  index: number;
  onClick: (milestone: MilestoneData) => void;
}

const MilestoneNode: React.FC<MilestoneNodeProps> = ({
  milestone,
  config,
  index,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // 根据状态确定颜色：绿色(完成) - 黄色(进行中) - 红色(未开始)
  const getStatusColor = () => {
    if (milestone.completed || milestone.status === 'completed') {
      return '#4CAF50'; // 绿色 - 完成
    } else if (milestone.status === 'in-progress') {
      return '#FFC107'; // 黄色 - 进行中  
    } else {
      return '#F44336'; // 红色 - 未开始
    }
  };
  
  // 获取较深的中心颜色
  const getCenterColor = (baseColor: string) => {
    const colorMap: { [key: string]: string } = {
      '#4CAF50': '#2E7D32', // 深绿色
      '#FFC107': '#F57C00', // 深黄色
      '#F44336': '#C62828'  // 深红色
    };
    return colorMap[baseColor] || '#666666';
  };
  
  // 格式化日期显示
  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}.${day}`;
  };
  
  const statusColor = getStatusColor();
  const centerColor = getCenterColor(statusColor);
  const nodeRadius = config.nodeSize || 16;
  
  // 信息卡片固定在节点下方
  const cardY = milestone.y + 40;
  const cardWidth = 160;
  const cardHeight = config.showDescription && milestone.description ? 50 : 30;
  
  // 处理鼠标事件
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const handleClick = () => onClick(milestone);
  
  return (
    <g className="milestone-node">
      {/* 日期显示（在节点上方） */}
      <text
        x={milestone.x}
        y={milestone.y - 25}
        textAnchor="middle"
        className="milestone-date"
        fill="var(--semi-color-text-1)"
        fontSize="14"
        fontWeight="600"
      >
        {formatDate(milestone.date)}
      </text>
      
      {/* 主节点圆圈 */}
      <circle
        cx={milestone.x}
        cy={milestone.y}
        r={nodeRadius}
        fill={statusColor}
        stroke="#ffffff"
        strokeWidth="3"
        className="milestone-circle"
        style={{
          cursor: 'pointer',
          filter: isHovered ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))',
          transition: 'filter 0.2s ease'
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* 中心小圆点 */}
      <circle
        cx={milestone.x}
        cy={milestone.y}
        r="4"
        fill={centerColor}
        className="milestone-center"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* 信息卡片背景 - 固定在节点下方 */}
      <rect
        x={milestone.x - cardWidth / 2}
        y={cardY}
        width={cardWidth}
        height={cardHeight}
        rx="8"
        ry="8"
        fill="white"
        stroke={statusColor}
        strokeWidth="2"
        className="info-card"
        style={{
          cursor: 'pointer',
          filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
          transition: 'filter 0.2s ease'
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* 标题文本 */}
      <text
        x={milestone.x}
        y={cardY + 18}
        textAnchor="middle"
        className="milestone-title"
        fill="var(--semi-color-text-0)"
        fontSize="13"
        fontWeight="500"
        style={{ pointerEvents: 'none' }}
      >
        {milestone.title.length > 20 
          ? milestone.title.substring(0, 20) + '...' 
          : milestone.title}
      </text>
      
      {/* 描述文本（如果启用且存在） */}
      {config.showDescription && milestone.description && (
        <text
          x={milestone.x}
          y={cardY + 35}
          textAnchor="middle"
          className="milestone-description"
          fill="var(--semi-color-text-2)"
          fontSize="11"
          style={{ pointerEvents: 'none' }}
        >
          {milestone.description.length > 24 
            ? milestone.description.substring(0, 24) + '...' 
            : milestone.description}
        </text>
      )}
      
      {/* 悬停详细工具提示 */}
      {isHovered && milestone.description && milestone.description.length > 24 && (
        <g className="milestone-tooltip">
          <rect
            x={milestone.x - 120}
            y={milestone.y - 60}
            width="240"
            height="30"
            rx="15"
            ry="15"
            fill="rgba(0, 0, 0, 0.9)"
            className="tooltip-bg"
          />
          <text
            x={milestone.x}
            y={milestone.y - 40}
            textAnchor="middle"
            fill="white"
            fontSize="12"
            style={{ pointerEvents: 'none' }}
          >
            {milestone.description}
          </text>
        </g>
      )}
    </g>
  );
};

export default MilestoneNode;