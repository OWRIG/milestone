import { bitable, dashboard } from "@lark-base-open/js-sdk";
import { MilestoneData, STimelineConfig, DashboardMode } from "../types";

// 时间线数据管理器
export class TimelineDataManager {
	private config: STimelineConfig;
	private mode: DashboardMode;

	constructor(config: STimelineConfig, mode: DashboardMode) {
		this.config = config;
		this.mode = mode;
	}

	// 步骤 1: 配置阶段 - 保存数据依赖声明
	async saveDataDependency(): Promise<boolean> {
		try {
			const dataConditions = {
				tableId: this.config.tableId,
				fieldIds: [
					this.config.dateField,
					this.config.titleField,
					this.config.descField,
					this.config.statusField,
				].filter(Boolean),
			};

			const configToSave = {
				dataConditions: [dataConditions],
				customConfig: this.config,
			};

			await dashboard.saveConfig(configToSave);
			return true;
		} catch (error) {
			console.error("保存配置失败:", error);
			return false;
		}
	}

	// 步骤 2: 展示阶段 - 获取数据（正确方式）
	async loadTimelineData(): Promise<MilestoneData[]> {
		if (!this.config.tableId || !this.config.dateField || !this.config.titleField) {
			console.log("配置不完整，返回模拟数据");
			return this.getMockData();
		}

		try {
			const table = await bitable.base.getTableById(this.config.tableId);
			const { records } = await table.getRecords({ pageSize: 5000 });

			const milestones: MilestoneData[] = [];

			for (const record of records) {
				const { fields, recordId } = record;

				const dateValue = fields[this.config.dateField];
				const titleCell = fields[this.config.titleField];

				if (!dateValue || !titleCell) {
					continue;
				}

				const titleValue = Array.isArray(titleCell)
					? titleCell.map((i) => (i as any).text || "").join(", ")
					: (titleCell as any).text || String(titleCell);

				const date = new Date(dateValue as number);
				if (isNaN(date.getTime())) {
					continue;
				}

				const descCell = this.config.descField ? fields[this.config.descField] : null;
				const description = descCell
					? Array.isArray(descCell)
						? descCell.map((i) => (i as any).text || "").join(", ")
						: (descCell as any).text || String(descCell)
					: undefined;

				const statusCell = this.config.statusField ? fields[this.config.statusField] : null;
				const status = statusCell
					? Array.isArray(statusCell)
						? statusCell.map((i) => (i as any).text || "").join(", ")
						: (statusCell as any).text || String(statusCell)
					: "pending";

				milestones.push({
					id: recordId,
					date,
					title: titleValue,
					description,
					status,
					completed: status === "已完成", // 核心修改点
					x: 0,
					y: 0,
				});
			}

			return this.applyTimeFilter(milestones.sort((a, b) => a.date.getTime() - b.date.getTime()));
		} catch (error) {
			console.error("通过表格 API 加载数据失败:", error);
			return this.getMockData();
		}
	}

	// 时间范围过滤功能
	private applyTimeFilter(milestones: MilestoneData[]): MilestoneData[] {
		if (!this.config.timeRange) return milestones;
		const { startDate, endDate } = this.config.timeRange;
		if (!startDate || !endDate) return milestones;
		return milestones.filter((m) => m.date >= new Date(startDate) && m.date <= new Date(endDate));
	}

	// 获取模拟数据
	public getMockData(): MilestoneData[] {
		const currentYear = new Date().getFullYear();
		return [
			{
				id: "mock1",
				date: new Date(currentYear, 0, 15),
				title: "项目启动",
				description: "项目正式启动，团队组建完成",
				status: "completed",
				completed: true,
				x: 0,
				y: 0,
			},
			{
				id: "mock2",
				date: new Date(currentYear, 2, 1),
				title: "需求分析完成",
				description: "产品需求分析和技术方案设计完成",
				status: "completed",
				completed: true,
				x: 0,
				y: 0,
			},
			{
				id: "mock3",
				date: new Date(currentYear, 5, 15),
				title: "开发阶段",
				description: "核心功能开发中",
				status: "in-progress",
				completed: false,
				x: 0,
				y: 0,
			},
			{
				id: "mock4",
				date: new Date(currentYear, 8, 30),
				title: "产品发布",
				description: "产品正式发布上线",
				status: "pending",
				completed: false,
				x: 0,
				y: 0,
			},
		];
	}

	// 更新配置
	updateConfig(config: STimelineConfig): void {
		this.config = config;
	}

	// 更新模式
	updateMode(mode: DashboardMode): void {
		this.mode = mode;
	}
}
