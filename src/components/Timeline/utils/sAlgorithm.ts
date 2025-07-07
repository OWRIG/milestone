import { line, curveBasis } from 'd3-shape';
import { MilestoneData, ContainerSize } from '../types';

// S型时间线算法实现
export class STimelineAlgorithm {
  private containerSize: ContainerSize;
  private margin = { top: 60, bottom: 60, left: 120, right: 120 };
  
  constructor(containerSize: ContainerSize) {
    this.containerSize = containerSize;
  }
  
  // 计算 S 型路径位置
  calculateSPath(milestones: MilestoneData[], curveTension: number = 0.5): MilestoneData[] {
    if (milestones.length === 0) return [];
    
    const { width, height } = this.containerSize;
    const drawWidth = width - this.margin.left - this.margin.right;
    const drawHeight = height - this.margin.top - this.margin.bottom;
    
    // 使用正弦波函数创建平滑的 S 型曲线
    const positions = milestones.map((milestone, index) => {
      const progress = milestones.length === 1 ? 0.5 : index / (milestones.length - 1);
      
      // 使用正弦波函数生成平滑的 S 型横坐标
      const sineValue = Math.sin(progress * Math.PI * 2 * curveTension); // 控制 S 型强度
      const normalizedSine = (sineValue + 1) / 2; // 归一化到 0-1
      
      // 横坐标：在左右边界之间振荡
      const x = this.margin.left + normalizedSine * drawWidth;
      
      // 纵坐标：按时间序列均匀分布
      const y = this.margin.top + progress * drawHeight;
      
      return {
        ...milestone,
        x,
        y
      };
    });
    
    return positions;
  }
  
  // 生成 SVG 路径字符串
  generateSVGPath(positions: MilestoneData[]): string {
    if (positions.length < 2) {
      return positions.length === 1 
        ? `M ${positions[0].x} ${positions[0].y}` 
        : '';
    }
    
    // 使用 d3-shape 生成平滑的贝塞尔曲线
    const lineGenerator = line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(curveBasis); // 使用 B 样条曲线插值
    
    return lineGenerator(positions.map(p => ({ x: p.x, y: p.y }))) || '';
  }
  
  // 高级版本：自适应 S 型曲线
  calculateAdaptiveSPath(milestones: MilestoneData[], config: {
    curveTension: number;
    adaptToContent: boolean;
    minSpacing: number;
  }): MilestoneData[] {
    if (milestones.length === 0) return [];
    
    const { width, height } = this.containerSize;
    const drawWidth = width - this.margin.left - this.margin.right;
    const drawHeight = height - this.margin.top - this.margin.bottom;
    
    // 计算时间距离权重
    const timeSpans = this.calculateTimeSpans(milestones);
    
    const positions = milestones.map((milestone, index) => {
      // 基于时间权重计算 Y 位置
      const timeProgress = config.adaptToContent 
        ? timeSpans[index]
        : index / (milestones.length - 1);
      
      // 动态调整 S 型幅度
      const adaptiveAmplitude = Math.min(drawWidth * 0.4, drawWidth / Math.sqrt(milestones.length));
      const sineValue = Math.sin(timeProgress * Math.PI * 2 * config.curveTension);
      
      const x = this.margin.left + drawWidth / 2 + sineValue * adaptiveAmplitude;
      const y = this.margin.top + timeProgress * drawHeight;
      
      return {
        ...milestone,
        x,
        y
      };
    });
    
    // 确保最小间距
    return this.enforceMinimumSpacing(positions, config.minSpacing);
  }
  
  // 计算时间权重
  private calculateTimeSpans(milestones: MilestoneData[]): number[] {
    if (milestones.length <= 1) return [0];
    
    const timeStamps = milestones.map(m => m.date.getTime());
    const totalTime = timeStamps[timeStamps.length - 1] - timeStamps[0];
    
    if (totalTime === 0) {
      // 如果所有时间戳相同，均匀分布
      return milestones.map((_, index) => index / (milestones.length - 1));
    }
    
    return timeStamps.map(time => (time - timeStamps[0]) / totalTime);
  }
  
  // 确保最小间距
  private enforceMinimumSpacing(positions: MilestoneData[], minSpacing: number): MilestoneData[] {
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      
      if (distance < minSpacing) {
        // 调整位置以维持最小间距
        const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        positions[i].x = prev.x + Math.cos(angle) * minSpacing;
        positions[i].y = prev.y + Math.sin(angle) * minSpacing;
      }
    }
    
    return positions;
  }
  
  // 更新容器尺寸
  updateContainerSize(containerSize: ContainerSize): void {
    this.containerSize = containerSize;
  }
}