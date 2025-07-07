import { MilestoneData, ContainerSize } from '../types';

// 横排S型时间线算法实现（自动换行）
export class STimelineAlgorithm {
  private containerSize: ContainerSize;
  private margin = { top: 80, bottom: 120, left: 40, right: 40 };
  private rowHeight = 120; // 每行高度，为信息卡片预留空间
  private minNodeSpacing = 80; // 节点最小间距
  
  constructor(containerSize: ContainerSize) {
    this.containerSize = containerSize;
  }
  
  // 计算横排S型路径（左右交替，自动换行）
  calculateSPath(milestones: MilestoneData[], minNodeSpacing: number = 80): MilestoneData[] {
    if (!milestones || milestones.length === 0) {
      return [];
    }
    
    const processedMilestones = [...milestones];
    const drawWidth = this.containerSize.width - this.margin.left - this.margin.right;
    this.minNodeSpacing = minNodeSpacing;
    
    // 按日期排序确保时间顺序
    processedMilestones.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // 计算每行可容纳的节点数
    const nodesPerRow = Math.floor(drawWidth / this.minNodeSpacing) || 1;
    
    // 为每个里程碑计算位置
    processedMilestones.forEach((milestone, index) => {
      const rowIndex = Math.floor(index / nodesPerRow);
      const colIndex = index % nodesPerRow;
      const isEvenRow = rowIndex % 2 === 0;
      
      // 计算在当前行中的实际列位置（奇数行从右往左）
      const actualColIndex = isEvenRow ? colIndex : (nodesPerRow - 1 - colIndex);
      
      // 计算节点间的实际间距（均匀分布）
      const actualSpacing = nodesPerRow > 1 ? drawWidth / (nodesPerRow - 1) : 0;
      
      // 设置坐标
      milestone.x = this.margin.left + (actualColIndex * actualSpacing);
      milestone.y = this.margin.top + (rowIndex * this.rowHeight);
    });
    
    return processedMilestones;
  }
  
  // 生成连接路径的SVG路径字符串
  generateSVGPath(milestones: MilestoneData[]): string {
    if (!milestones || milestones.length < 2) {
      return '';
    }
    
    let pathData = '';
    const nodesPerRow = this.getNodesPerRow();
    
    for (let i = 0; i < milestones.length - 1; i++) {
      const current = milestones[i];
      const next = milestones[i + 1];
      
      if (i === 0) {
        pathData += `M ${current.x} ${current.y}`;
      }
      
      // 检查是否需要绘制S型转折
      const currentRow = Math.floor(i / nodesPerRow);
      const nextRow = Math.floor((i + 1) / nodesPerRow);
      
      if (currentRow === nextRow) {
        // 同一行，直线连接
        pathData += ` L ${next.x} ${next.y}`;
      } else {
        // 不同行，绘制S型转折
        const midY = current.y + (next.y - current.y) / 2;
        pathData += ` Q ${current.x} ${midY} ${next.x} ${next.y}`;
      }
    }
    
    return pathData;
  }
  
  // 获取每行节点数
  private getNodesPerRow(): number {
    const drawWidth = this.containerSize.width - this.margin.left - this.margin.right;
    return Math.floor(drawWidth / this.minNodeSpacing) || 1;
  }
  
  // 计算动态容器高度
  calculateRequiredHeight(milestoneCount: number): number {
    const nodesPerRow = this.getNodesPerRow();
    const totalRows = Math.ceil(milestoneCount / nodesPerRow);
    return this.margin.top + this.margin.bottom + (totalRows * this.rowHeight);
  }
  
  // 获取节点行列信息
  getNodePosition(index: number): { row: number; col: number; isRightToLeft: boolean } {
    const nodesPerRow = this.getNodesPerRow();
    const row = Math.floor(index / nodesPerRow);
    const col = index % nodesPerRow;
    const isRightToLeft = row % 2 === 1;
    
    return { row, col, isRightToLeft };
  }
  
  // 设置行高
  setRowHeight(height: number): void {
    this.rowHeight = height;
  }
  
  // 设置最小节点间距
  setMinNodeSpacing(spacing: number): void {
    this.minNodeSpacing = spacing;
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
      minNodeSpacing: this.minNodeSpacing
    };
  }
}