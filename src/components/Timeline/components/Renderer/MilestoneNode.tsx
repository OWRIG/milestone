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
  
  // 判断是否已完成
  const isCompleted = milestone.completed || milestone.date < new Date();
  
  // 根据索引选择颜色（参考图片的彩色设计）
  const getNodeColors = () => {
    const colors = [
      { bg: '#4CAF50', center: '#2E7D32' }, // 绿色
      { bg: '#00BCD4', center: '#006064' }, // 青色  
      { bg: '#2196F3', center: '#0D47A1' }, // 蓝色
      { bg: '#E91E63', center: '#880E4F' }, // 粉色
      { bg: '#FF9800', center: '#E65100' }, // 橙色
      { bg: '#FFEB3B', center: '#F57F17' }, // 黄色
      { bg: '#9C27B0', center: '#4A148C' }, // 紫色
      { bg: '#795548', center: '#3E2723' }, // 棕色
    ];
    
    if (isCompleted) {
      return { bg: config.completedColor, center: '#2E7D32' };
    }
    
    return colors[index % colors.length];
  };
  
  // 格式化日期显示（简化格式）
  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}.${day}`;
  };
  
  // 计算布局位置
  const nodeRadius = config.nodeSize;
  const isEven = index % 2 === 0;
  const textBoxOffset = 50; // 文本框与节点的距离
  const textBoxY = milestone.y + (isEven ? textBoxOffset : -textBoxOffset);
  const dateY = milestone.y - 25; // 日期在节点上方
  
  const colors = getNodeColors();
  
  // 处理鼠标事件（修复抖动问题）
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  const handleClick = () => {
    onClick(milestone);
  };
  
  return (
    <g className="milestone-node">
      {/* 连接线：从节点到文本框 */}
      <line
        x1={milestone.x}
        y1={milestone.y}
        x2={milestone.x}
        y2={textBoxY - (isEven ? 20 : -20)}
        stroke={colors.bg}
        strokeWidth="2"
        className="connection-line"
      />
      
      {/* 日期显示（在节点上方） */}
      <text
        x={milestone.x}
        y={dateY}
        textAnchor="middle"
        className="milestone-date"
        fill="var(--semi-color-text-0)"
        fontSize="16"
        fontWeight="700"
      >
        {formatDate(milestone.date)}
      </text>
      
      {/* 主节点圆圈 */}
      <circle
        cx={milestone.x}
        cy={milestone.y}
        r={nodeRadius}
        fill={colors.bg}
        stroke="#ffffff"
        strokeWidth="3"
        className="milestone-circle"
        style={{
          cursor: 'pointer',
          filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
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
        fill={colors.center}
        className="milestone-center"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* 文本框背景 */}
      <rect
        x={milestone.x - 80}
        y={textBoxY - 20}
        width="160"
        height="40"
        rx="20"
        ry="20"
        fill="white"
        stroke={colors.bg}
        strokeWidth="2"
        className="text-box"
        style={{
          cursor: 'pointer',
          filter: isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' : 'none',
          transition: 'filter 0.2s ease'
        }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      
      {/* 标题文本 */}
      <text
        x={milestone.x}
        y={textBoxY - 4}
        textAnchor="middle"
        className="milestone-title"
        fill="var(--semi-color-text-0)"
        fontSize="13"
        fontWeight="500"
        style={{ pointerEvents: 'none' }}
      >
        {milestone.title.length > 18 
          ? milestone.title.substring(0, 18) + '...' 
          : milestone.title}
      </text>
      
      {/* 描述文本 */}
      {config.showDescription && milestone.description && (
        <text
          x={milestone.x}
          y={textBoxY + 8}
          textAnchor="middle"
          className="milestone-description"
          fill="var(--semi-color-text-2)"
          fontSize="11"
          style={{ pointerEvents: 'none' }}
        >
          {milestone.description.length > 20 
            ? milestone.description.substring(0, 20) + '...' 
            : milestone.description}
        </text>
      )}
      
      {/* 状态标签（如果存在） */}
      {milestone.status && milestone.status !== 'pending' && (
        <g className="status-badge">
          <rect
            x={milestone.x + 25}
            y={milestone.y - 35}
            width={milestone.status === 'completed' ? '60' : '45'}
            height="20"
            rx="10"
            ry="10"
            fill={milestone.status === 'completed' ? '#4CAF50' : '#2196F3'}
            className="status-bg"
          />
          <text
            x={milestone.x + (milestone.status === 'completed' ? 55 : 47.5)}
            y={milestone.y - 22}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="600"
            style={{ pointerEvents: 'none' }}
          >
            {milestone.status === 'completed' ? '已完成' : 
             milestone.status === 'in-progress' ? '进行中' : milestone.status}
          </text>
        </g>
      )}
      
      {/* 悬停工具提示（简化版） */}
      {isHovered && milestone.description && (
        <g className="milestone-tooltip">
          <rect
            x={milestone.x - 100}
            y={milestone.y - 80}
            width="200"
            height="30"
            rx="15"
            ry="15"
            fill="rgba(0, 0, 0, 0.8)"
            className="tooltip-bg"
          />
          <text
            x={milestone.x}
            y={milestone.y - 60}
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