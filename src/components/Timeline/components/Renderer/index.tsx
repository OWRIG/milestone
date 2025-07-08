import React, { useMemo } from "react";
import { MilestoneData, STimelineConfig, ContainerSize } from "../../types";
import "./style.scss";

interface TimelineRendererProps {
	milestones: MilestoneData[];
	config: STimelineConfig;
	containerSize: ContainerSize;
	onMilestoneClick?: (milestone: MilestoneData) => void;
}

// 新的辅助组件，用于处理文本换行
const WrappedDescription: React.FC<{
	text: string;
	x: number;
	y: number;
	maxWidth: number;
	fontSize: number;
	className?: string;
	fill?: string;
}> = ({ text, x, y, maxWidth, fontSize, className, fill }) => {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let currentLine = "";

	words.forEach((word) => {
		// 估算单词和当前行的宽度。注意：这是一个简化的估算。
		// 在SVG中精确测量文本需要更复杂的方法，但这对于大多数等宽或比例字体是一个合理的近似。
		const estimatedWordWidth = word.length * fontSize * 0.6;
		const estimatedLineWidth = currentLine.length * fontSize * 0.6;

		if (estimatedLineWidth + estimatedWordWidth > maxWidth && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine += (currentLine ? " " : "") + word;
		}
	});
	if (currentLine) {
		lines.push(currentLine);
	}

	return (
		<text x={x} y={y} textAnchor="middle" fontSize={fontSize} fill={fill} className={className}>
			{lines.map((line, index) => (
				<tspan key={index} x={x} dy={index === 0 ? 0 : "1.2em"}>
					{line}
				</tspan>
			))}
		</text>
	);
};

const TimelineRenderer: React.FC<TimelineRendererProps> = ({ milestones, config, containerSize, onMilestoneClick }) => {
	// 自适应 S 型横向布局计算
	const processedMilestones = useMemo(() => {
		if (milestones.length === 0) return [];

		// 动态计算布局参数
		const minPadding = 40;
		const maxPadding = 80;
		const containerWidth = containerSize.width;
		const containerHeight = containerSize.height;

		// 根据容器大小动态调整边距
		const padding = Math.min(maxPadding, Math.max(minPadding, containerWidth * 0.06));
		const availableWidth = containerWidth - padding * 2;

		// 智能节点间距计算
		const minSpacing = config.minNodeSpacing || 180;
		const maxSpacing = minSpacing * 2;
		const idealNodesPerRow = Math.max(2, Math.min(6, Math.floor(availableWidth / minSpacing)));

		// 计算实际节点间距，充分利用空间
		const actualSpacing = Math.min(maxSpacing, availableWidth / idealNodesPerRow);
		const nodesPerRow = Math.max(1, Math.floor(availableWidth / actualSpacing));

		// 根据容器高度动态调整行高
		const minRowHeight = 120;
		const maxRowHeight = 200;
		const totalRows = Math.ceil(milestones.length / nodesPerRow);
		const availableHeight = containerHeight - 240; // 留出上下边距
		const idealRowHeight =
			totalRows > 1 ? Math.min(maxRowHeight, Math.max(minRowHeight, availableHeight / totalRows)) : minRowHeight;

		return milestones.map((milestone, index) => {
			const rowIndex = Math.floor(index / nodesPerRow);
			const colIndex = index % nodesPerRow;

			// S 型布局：奇数行从右到左，偶数行从左到右
			const isOddRow = rowIndex % 2 === 1;
			const actualColIndex = isOddRow ? nodesPerRow - 1 - colIndex : colIndex;

			// 居中对齐的节点位置计算
			const totalRowWidth = (nodesPerRow - 1) * actualSpacing;
			const startX = padding + (availableWidth - totalRowWidth) / 2;
			const x = startX + actualColIndex * actualSpacing;
			const y = 120 + rowIndex * idealRowHeight;

			return {
				...milestone,
				x,
				y,
			};
		});
	}, [milestones, containerSize, config.minNodeSpacing]);

	// 生成自适应 S 型连接线路径
	const linePath = useMemo(() => {
		if (processedMilestones.length < 2) return "";

		const pathParts: string[] = [];

		// 重新计算布局参数以保证一致性
		const minPadding = 40;
		const maxPadding = 80;
		const containerWidth = containerSize.width;
		const padding = Math.min(maxPadding, Math.max(minPadding, containerWidth * 0.06));
		const availableWidth = containerWidth - padding * 2;

		const minSpacing = config.minNodeSpacing || 180;
		const maxSpacing = minSpacing * 2;
		const idealNodesPerRow = Math.max(2, Math.min(6, Math.floor(availableWidth / minSpacing)));
		const actualSpacing = Math.min(maxSpacing, availableWidth / idealNodesPerRow);
		const nodesPerRow = Math.max(1, Math.floor(availableWidth / actualSpacing));

		processedMilestones.forEach((milestone, index) => {
			if (index === 0) {
				pathParts.push(`M ${milestone.x} ${milestone.y}`);
			} else {
				const prevMilestone = processedMilestones[index - 1];

				// 如果是同一行，直接连接
				if (Math.abs(milestone.y - prevMilestone.y) < 10) {
					pathParts.push(`L ${milestone.x} ${milestone.y}`);
				} else {
					// 换行时使用自适应半圆弧，形成 S 型
					const prevRowIndex = Math.floor((index - 1) / nodesPerRow);
					const currentRowIndex = Math.floor(index / nodesPerRow);

					const deltaY = Math.abs(milestone.y - prevMilestone.y);
					const radius = Math.min(deltaY / 2, actualSpacing / 2); // 限制弧的大小

					// 根据行数确定弧的方向，形成真正的 S 型
					const sweepFlag = prevRowIndex % 2 === 0 ? 1 : 0;
					const largeArcFlag = 0;

					pathParts.push(
						`A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${milestone.x} ${milestone.y}`
					);
				}
			}
		});

		return pathParts.join(" ");
	}, [processedMilestones, containerSize.width, config.minNodeSpacing]);

	// 获取状态颜色
	const getStatusColor = (milestone: MilestoneData) => {
		const statusText = milestone.status || "";
		if (statusText === "已完成") {
			return "#4CAF50"; // 绿色 - 完成
		} else if (statusText === "进行中") {
			return "#FFC107"; // 黄色 - 进行中
		} else if (statusText === "未开始") {
			return "#F44336"; // 红色 - 未开始
		} else {
			return "#9E9E9E"; // 灰色 - 其他/默认
		}
	};

	// 计算实际需要的高度 - 必须在所有条件返回之前
	const requiredHeight = useMemo(() => {
		if (processedMilestones.length === 0) return containerSize.height;

		const maxY = Math.max(...processedMilestones.map((m) => m.y));
		const dynamicBottomPadding = Math.max(150, containerSize.height * 0.15); // 动态底部边距
		return Math.max(containerSize.height, maxY + dynamicBottomPadding);
	}, [processedMilestones, containerSize.height]);

	// 处理点击事件
	const handleMilestoneClick = (milestone: MilestoneData) => {
		onMilestoneClick?.(milestone);
	};

	// 如果没有数据，显示空状态
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

	return (
		<div className="s-timeline-renderer">
			<svg
				width={containerSize.width}
				height={requiredHeight}
				viewBox={`0 0 ${containerSize.width} ${requiredHeight}`}
				className="s-timeline-svg">
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
								style={{ cursor: "pointer" }}
								onClick={() => handleMilestoneClick(milestone)}
							/>

							{/* 日期标签 */}
							<text
								x={milestone.x}
								y={milestone.y - config.nodeSize - 10}
								textAnchor="middle"
								fontSize={Math.max(10, Math.min(14, containerSize.width / 100))}
								fill="var(--semi-color-text-1)"
								className="milestone-date">
								{milestone.date.toLocaleDateString("zh-CN", {
									month: "short",
									day: "numeric",
								})}
							</text>

							{/* 标题 */}
							<text
								x={milestone.x}
								y={milestone.y + config.nodeSize + 20}
								textAnchor="middle"
								fontSize={Math.max(12, Math.min(16, containerSize.width / 80))}
								fontWeight="500"
								fill="var(--semi-color-text-0)"
								className="milestone-title"
								style={{ cursor: "pointer" }}
								onClick={() => handleMilestoneClick(milestone)}>
								{milestone.title}
							</text>

							{/* 描述 - 使用新的换行组件 */}
							{config.showDescription && milestone.description && (
								<WrappedDescription
									text={milestone.description}
									x={milestone.x}
									y={milestone.y + config.nodeSize + 40} // 调整初始Y坐标为标题留出空间
									maxWidth={config.minNodeSpacing ? config.minNodeSpacing * 0.9 : 150} // 限制最大宽度
									fontSize={Math.max(9, Math.min(12, containerSize.width / 120))}
									fill="var(--semi-color-text-2)"
									className="milestone-description"
								/>
							)}
						</g>
					);
				})}
			</svg>
		</div>
	);
};

export default TimelineRenderer;
