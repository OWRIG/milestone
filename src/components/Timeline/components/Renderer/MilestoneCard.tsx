import React, { useState } from 'react';
import { MilestoneData, STimelineConfig } from '../../types';

interface MilestoneCardProps {
  milestone: MilestoneData;
  config: STimelineConfig;
  index: number;
  onClick: (milestone: MilestoneData) => void;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
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
  
  const statusColor = getStatusColor();
  
  // 计算卡片位置 - 在节点下方40px
  const cardX = milestone.x;
  const cardY = milestone.y + 40;
  
  // 卡片尺寸
  const cardWidth = 160;
  const cardHeight = config.showDescription && milestone.description ? 60 : 40;
  
  // 处理鼠标事件
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const handleClick = () => onClick(milestone);
  
  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    transform: `translate(${cardX - cardWidth / 2}px, ${cardY}px)`,
    width: `${cardWidth}px`,
    minHeight: `${cardHeight}px`,
    backgroundColor: 'white',
    border: `2px solid ${statusColor}`,
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: isHovered 
      ? '0 4px 12px rgba(0,0,0,0.15)' 
      : '0 2px 6px rgba(0,0,0,0.1)',
    zIndex: isHovered ? 10 : 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontFamily: 'var(--semi-font-family)',
  };
  
  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--semi-color-text-0)',
    margin: '0 0 4px 0',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    wordBreak: 'break-word',
  };
  
  const descriptionStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--semi-color-text-2)',
    margin: '0',
    opacity: 0.8,
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    wordBreak: 'break-word',
  };
  
  return (
    <div
      className="milestone-card"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <h4 style={titleStyle}>
        {milestone.title}
      </h4>
      
      {config.showDescription && milestone.description && (
        <p style={descriptionStyle}>
          {milestone.description}
        </p>
      )}
      
      {/* 悬停时显示完整信息的工具提示 */}
      {isHovered && (milestone.title.length > 30 || (milestone.description && milestone.description.length > 50)) && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            maxWidth: '200px',
            zIndex: 20,
            pointerEvents: 'none',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: '1.4',
          }}
        >
          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
            {milestone.title}
          </div>
          {milestone.description && (
            <div style={{ opacity: 0.9 }}>
              {milestone.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MilestoneCard;