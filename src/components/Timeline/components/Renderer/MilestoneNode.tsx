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
  
  // 根据状态选择颜色
  const getNodeColor = () => {
    if (isCompleted) {
      return config.completedColor;
    }
    return config.nodeColor;
  };
  
  // 获取节点样式
  const getNodeStyle = () => {
    const baseSize = config.nodeSize;
    const scale = isHovered ? 1.2 : 1;
    return {
      r: baseSize * scale,
      fill: getNodeColor(),
      stroke: '#ffffff',
      strokeWidth: 2,
      filter: isHovered ? 'url(#glow)' : 'url(#shadow)',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    };
  };
  
  // 处理点击事件
  const handleClick = () => {
    onClick(milestone);
  };
  
  // 处理鼠标悬停
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  // 格式化日期显示
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // 计算文本位置
  const getTextPosition = () => {
    const textOffset = config.nodeSize + 12;
    const isEven = index % 2 === 0;
    
    return {
      x: milestone.x,
      y: milestone.y + (isEven ? -textOffset : textOffset),
      textAnchor: 'middle' as const,
      dominantBaseline: isEven ? 'text-after-edge' : 'text-before-edge' as const
    };
  };
  
  const textPos = getTextPosition();
  
  return (
    <g className="milestone-node">
      {/* 节点圆圈 */}
      <circle
        cx={milestone.x}
        cy={milestone.y}
        {...getNodeStyle()}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`milestone-circle ${isCompleted ? 'completed' : 'pending'}`}
      />
      
      {/* 完成状态标记 */}
      {isCompleted && (
        <path
          d={`M ${milestone.x - 4} ${milestone.y} 
              L ${milestone.x - 1} ${milestone.y + 3} 
              L ${milestone.x + 4} ${milestone.y - 3}`}
          stroke="#ffffff"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      
      {/* 文本标签 */}
      <g 
        className="milestone-text"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 标题 */}
        <text
          x={textPos.x}
          y={textPos.y}
          textAnchor={textPos.textAnchor}
          dominantBaseline={textPos.dominantBaseline}
          className="milestone-title"
          fill="var(--semi-color-text-0)"
          fontSize="14"
          fontWeight="600"
        >
          {milestone.title}
        </text>
        
        {/* 日期 */}
        <text
          x={textPos.x}
          y={textPos.y + (index % 2 === 0 ? -16 : 16)}
          textAnchor={textPos.textAnchor}
          dominantBaseline={textPos.dominantBaseline}
          className="milestone-date"
          fill="var(--semi-color-text-2)"
          fontSize="12"
        >
          {formatDate(milestone.date)}
        </text>
        
        {/* 描述（如果配置显示且存在） */}
        {config.showDescription && milestone.description && (
          <text
            x={textPos.x}
            y={textPos.y + (index % 2 === 0 ? -30 : 30)}
            textAnchor={textPos.textAnchor}
            dominantBaseline={textPos.dominantBaseline}
            className="milestone-description"
            fill="var(--semi-color-text-1)"
            fontSize="11"
          >
            {milestone.description.length > 20 
              ? milestone.description.substring(0, 20) + '...' 
              : milestone.description}
          </text>
        )}
      </g>
      
      {/* 悬停提示框 */}
      {isHovered && (
        <g className="milestone-tooltip">
          <rect
            x={milestone.x - 80}
            y={milestone.y - 60}
            width="160"
            height="50"
            fill="var(--semi-color-bg-0)"
            stroke="var(--semi-color-border)"
            strokeWidth="1"
            rx="4"
            filter="url(#shadow)"
          />
          <text
            x={milestone.x}
            y={milestone.y - 40}
            textAnchor="middle"
            fill="var(--semi-color-text-0)"
            fontSize="12"
            fontWeight="600"
          >
            {milestone.title}
          </text>
          <text
            x={milestone.x}
            y={milestone.y - 25}
            textAnchor="middle"
            fill="var(--semi-color-text-1)"
            fontSize="11"
          >
            {formatDate(milestone.date)}
          </text>
          {milestone.status && (
            <text
              x={milestone.x}
              y={milestone.y - 12}
              textAnchor="middle"
              fill="var(--semi-color-text-2)"
              fontSize="10"
            >
              状态: {milestone.status}
            </text>
          )}
        </g>
      )}
    </g>
  );
};

export default MilestoneNode;