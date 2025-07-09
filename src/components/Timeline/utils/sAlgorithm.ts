import { MilestoneData, ContainerSize } from "../types";

// 横排S型时间线算法实现（自动换行）
export class STimelineAlgorithm {
	private containerSize: ContainerSize;
	private margin = { top: 80, bottom: 120, left: 40, right: 40 };
	private rowHeight = 140; // 每行高度，为信息卡片预留空间
	private minNodeSpacing = 120; // 节点最小间距
	private maxNodeSpacing = 200; // 节点最大间距
	private maxNodesPerRow = 6; // 每行最大节点数

	constructor(containerSize: ContainerSize) {
		this.containerSize = containerSize;
	}

	// 计算横排S型路径（左右交替，自动换行）
	calculateSPath(milestones: MilestoneData[], minNodeSpacing: number = 120): MilestoneData[] {
		if (!milestones || milestones.length === 0) {
			return [];
		}

		const processedMilestones = [...milestones];
		const drawWidth = this.containerSize.width - this.margin.left - this.margin.right;
		this.minNodeSpacing = Math.max(minNodeSpacing, 80); // 确保最小间距不会太小

		// 按日期排序确保时间顺序
		processedMilestones.sort((a, b) => a.date.getTime() - b.date.getTime());

		// 智能计算每行节点数
		const optimalLayout = this.calculateOptimalLayout(processedMilestones.length, drawWidth);

		// 为每个里程碑计算位置
		processedMilestones.forEach((milestone, index) => {
			const position = this.calculateNodePosition(index, optimalLayout, drawWidth);
			milestone.x = this.margin.left + position.x;
			milestone.y = this.margin.top + position.y;
		});

		return processedMilestones;
	}

	// 智能计算最优布局
	private calculateOptimalLayout(totalNodes: number, drawWidth: number) {
		// 根据容器宽度计算理想的每行节点数
		const idealNodesPerRow = Math.floor(drawWidth / this.minNodeSpacing);

		// 限制在合理范围内
		const maxPossibleNodes = Math.floor(drawWidth / this.minNodeSpacing);
		const minNodesPerRow = Math.max(1, Math.min(3, maxPossibleNodes));
		const optimalNodesPerRow = Math.min(this.maxNodesPerRow, Math.max(minNodesPerRow, idealNodesPerRow));

		// 如果节点总数较少，尝试调整为更美观的布局
		let nodesPerRow = optimalNodesPerRow;
		if (totalNodes <= 8) {
			// 少量节点时，尝试更紧凑的布局
			nodesPerRow = Math.min(Math.ceil(Math.sqrt(totalNodes * 1.5)), optimalNodesPerRow);
		}

		// 计算实际间距
		const actualSpacing = this.calculateActualSpacing(nodesPerRow, drawWidth);

		return {
			nodesPerRow,
			actualSpacing,
			totalRows: Math.ceil(totalNodes / nodesPerRow),
		};
	}

	// 计算实际节点间距
	private calculateActualSpacing(nodesPerRow: number, drawWidth: number): number {
		if (nodesPerRow <= 1) return 0;

		// 使用可用宽度均匀分布节点
		const spacing = drawWidth / (nodesPerRow - 1);

		// 确保间距在合理范围内
		return Math.min(this.maxNodeSpacing, Math.max(this.minNodeSpacing, spacing));
	}

	// 计算单个节点位置
	private calculateNodePosition(index: number, layout: any, drawWidth: number) {
		const { nodesPerRow, actualSpacing } = layout;

		const rowIndex = Math.floor(index / nodesPerRow);
		const colIndex = index % nodesPerRow;
		const isEvenRow = rowIndex % 2 === 0;

		// 计算在当前行中的实际列位置（奇数行从右往左）
		let actualColIndex: number;
		const currentRowNodes = Math.min(nodesPerRow, index - rowIndex * nodesPerRow + 1);

		if (isEvenRow) {
			// 偶数行：从左到右
			actualColIndex = colIndex;
		} else {
			// 奇数行：从右到左
			actualColIndex = nodesPerRow - 1 - colIndex;
		}

		// 如果是最后一行且节点数不足一行，居中对齐
		const remainingNodes = index + 1 - rowIndex * nodesPerRow;
		const isLastRow = rowIndex === Math.ceil((index + 1) / nodesPerRow) - 1;

		let x: number;
		if (isLastRow && remainingNodes < nodesPerRow && remainingNodes > 1) {
			// 最后一行节点居中
			const totalWidth = (remainingNodes - 1) * actualSpacing;
			const startX = (drawWidth - totalWidth) / 2;
			const adjustedColIndex = isEvenRow ? colIndex : remainingNodes - 1 - colIndex;
			x = startX + adjustedColIndex * actualSpacing;
		} else if (remainingNodes === 1) {
			// 单个节点居中
			x = drawWidth / 2;
		} else {
			// 正常布局
			x = actualColIndex * actualSpacing;
		}

		const y = rowIndex * this.rowHeight;

		return { x, y };
	}

	// 生成连接路径的SVG路径字符串
	generateSVGPath(milestones: MilestoneData[]): string {
		if (!milestones || milestones.length < 2) {
			return "";
		}

		let pathData = "";
		const layout = this.calculateOptimalLayout(
			milestones.length,
			this.containerSize.width - this.margin.left - this.margin.right
		);

		for (let i = 0; i < milestones.length - 1; i++) {
			const current = milestones[i];
			const next = milestones[i + 1];

			// 安全检查，确保坐标存在
			if (
				typeof current.x === "undefined" ||
				typeof current.y === "undefined" ||
				typeof next.x === "undefined" ||
				typeof next.y === "undefined"
			) {
				continue; // 如果坐标不完整，则跳过此段路径
			}

			if (i === 0) {
				pathData += `M ${current.x} ${current.y}`;
			}

			// 检查是否需要绘制S型转折
			const currentRow = Math.floor(i / layout.nodesPerRow);
			const nextRow = Math.floor((i + 1) / layout.nodesPerRow);

			if (currentRow === nextRow) {
				// 同一行，直线连接
				pathData += ` L ${next.x} ${next.y}`;
			} else {
				// 不同行，绘制平滑的S型转折
				const isCurrentRowEven = currentRow % 2 === 0;
				const controlPoint1X = isCurrentRowEven ? current.x + 50 : current.x - 50;
				const controlPoint2X = !isCurrentRowEven ? next.x + 50 : next.x - 50;

				const midY = current.y + (next.y - current.y) / 2;

				// 使用贝塞尔曲线创建平滑的S型连接
				pathData += ` C ${controlPoint1X} ${midY} ${controlPoint2X} ${midY} ${next.x} ${next.y}`;
			}
		}

		return pathData;
	}

	// 获取每行节点数（公共方法）
	getNodesPerRow(): number {
		const drawWidth = this.containerSize.width - this.margin.left - this.margin.right;
		const layout = this.calculateOptimalLayout(10, drawWidth); // 使用默认值计算
		return layout.nodesPerRow;
	}

	// 计算动态容器高度
	calculateRequiredHeight(milestoneCount: number): number {
		const drawWidth = this.containerSize.width - this.margin.left - this.margin.right;
		const layout = this.calculateOptimalLayout(milestoneCount, drawWidth);
		return this.margin.top + this.margin.bottom + layout.totalRows * this.rowHeight;
	}

	// 获取节点行列信息
	getNodePosition(index: number): { row: number; col: number; isRightToLeft: boolean } {
		const drawWidth = this.containerSize.width - this.margin.left - this.margin.right;
		const layout = this.calculateOptimalLayout(index + 1, drawWidth);
		const row = Math.floor(index / layout.nodesPerRow);
		const col = index % layout.nodesPerRow;
		const isRightToLeft = row % 2 === 1;

		return { row, col, isRightToLeft };
	}

	// 设置行高
	setRowHeight(height: number): void {
		this.rowHeight = Math.max(100, height); // 确保最小行高
	}

	// 设置最小节点间距
	setMinNodeSpacing(spacing: number): void {
		this.minNodeSpacing = Math.max(80, spacing); // 确保最小间距
	}

	// 设置最大节点间距
	setMaxNodeSpacing(spacing: number): void {
		this.maxNodeSpacing = Math.max(150, spacing);
	}

	// 设置每行最大节点数
	setMaxNodesPerRow(count: number): void {
		this.maxNodesPerRow = Math.max(3, Math.min(10, count));
	}

	// 更新容器尺寸
	updateContainerSize(containerSize: ContainerSize): void {
		this.containerSize = containerSize;
	}

	// 获取当前配置
	getConfig() {
		return {
			containerSize: this.containerSize,
			margin: this.margin,
			rowHeight: this.rowHeight,
			minNodeSpacing: this.minNodeSpacing,
			maxNodeSpacing: this.maxNodeSpacing,
			maxNodesPerRow: this.maxNodesPerRow,
		};
	}
}
