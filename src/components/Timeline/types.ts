// S型时间线插件类型定义

// 使用SDK的类型定义

export enum DashboardMode {
	Create = "create",
	Config = "config",
	View = "view",
	FullScreen = "fullscreen",
}

export interface STimelineConfig extends Record<string, unknown> {
	// 数据源配置
	tableId: string;
	viewId?: string;
	dataRange?: {
		type: "ALL" | "RANGE";
		ranges?: string[];
	};

	// 字段映射
	dateField: string; // 日期字段（必需）
	titleField: string; // 标题字段（必需）
	descField?: string; // 描述字段（可选）
	statusField?: string; // 状态字段（可选）

	// 时间范围配置
	timeRange?: {
		startDate: Date;
		endDate: Date;
		autoRange: "year" | "month" | "quarter" | "custom";
	};

	// 样式配置
	nodeColor: string; // 节点颜色
	lineColor: string; // 连接线颜色
	completedColor: string; // 已完成颜色

	// 布局配置
	curveTension: number; // S型曲线张力
	nodeSize: number; // 节点大小
	showDescription: boolean; // 显示描述
	adaptiveLayout: boolean; // 自适应布局
	minNodeSpacing: number; // 最小节点间距
}

export interface MilestoneData {
	id: string;
	date: Date;
	title: string;
	description?: string;
	status: string; // 允许任意状态文本
	completed: boolean;
	// Position coordinates (added by algorithm)
	x: number;
	y: number;
}

export interface DashboardState {
	mode: DashboardMode;
	config: STimelineConfig;
	data: MilestoneData[];
	loading: boolean;
	error: string | null;
}

export interface ContainerSize {
	width: number;
	height: number;
}

export interface STimelineProps {
	containerSize: ContainerSize;
	onConfigChange?: (config: STimelineConfig) => void;
	onSave?: () => Promise<boolean>;
}

export interface ConfigPanelProps {
	config: STimelineConfig;
	onConfigChange: (config: STimelineConfig) => void;
	onSave?: () => Promise<boolean>;
	loading?: boolean;
}

export interface STimelineRendererProps {
	milestones: MilestoneData[];
	config: STimelineConfig;
	containerSize: ContainerSize;
}

export interface MilestoneNodeProps {
	milestone: MilestoneData;
	config: STimelineConfig;
	isActive?: boolean;
	onClick?: (milestone: MilestoneData) => void;
}
