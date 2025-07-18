import React, { useState, useEffect, useCallback, useMemo } from "react";
import { dashboard } from "@lark-base-open/js-sdk";
import TimelineRenderer from "./components/Renderer";
import ConfigPanel from "./components/ConfigPanel";
import { STimelineConfig, MilestoneData, DashboardMode } from "./types";
import { TimelineDataManager } from "./utils/dataProcessor";
import "./style.scss";

// 简化的默认配置 - 只保留必要的配置项
const getDefaultConfig = (): STimelineConfig => ({
	tableId: "",
	dateField: "",
	titleField: "",
	descField: "",
	statusField: "",
	timeRange: {
		startDate: new Date(2025, 0, 1), // 2025年1月1日
		endDate: new Date(2026, 11, 31), // 2026年12月31日
		autoRange: "custom",
	},
	nodeColor: "#1890ff",
	lineColor: "#d9d9d9",
	completedColor: "#52c41a",
	curveTension: 0.5,
	nodeSize: 12,
	showDescription: true,
	adaptiveLayout: true,
	minNodeSpacing: 200, // 增加默认节点间距
});

interface TimelineDashboardProps {
	containerSize?: { width: number; height: number };
	mode?: DashboardMode;
}

const TimelineDashboard: React.FC<TimelineDashboardProps> = ({
	containerSize = { width: 1200, height: 600 },
	mode = DashboardMode.Config,
}) => {
	const [config, setConfig] = useState<STimelineConfig>(getDefaultConfig());
	const [milestones, setMilestones] = useState<MilestoneData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const [actualContainerSize, setActualContainerSize] = useState(containerSize);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const resizeObserverRef = React.useRef<ResizeObserver>();

	// 直接使用 dashboard.state 检测状态，参照官方示例
	const dashboardState = dashboard.state;

	const isCreate = dashboardState === "Create";
	const isConfig = dashboardState === "Config" || isCreate;
	const isView = dashboardState === "View";
	const isFullScreen = dashboardState === "FullScreen";

	// 使用 useMemo 稳定 currentMode 计算
	const currentMode = useMemo(() => {
		if (isCreate) return DashboardMode.Create;
		if (isConfig && !isCreate) return DashboardMode.Config;
		if (isView) return DashboardMode.View;
		if (isFullScreen) return DashboardMode.FullScreen;
		return DashboardMode.Config;
	}, [isCreate, isConfig, isView, isFullScreen]);

	// 加载数据
	const loadData = useCallback(async (configToUse: STimelineConfig, modeToUse: DashboardMode) => {
		setLoading(true);
		setError("");
		try {
			const dataManager = new TimelineDataManager(configToUse, modeToUse);
			const data = await dataManager.loadTimelineData();
			setMilestones(data);
			if (data.length === 0 && configToUse.tableId) {
				setError("未找到符合条件的数据，请检查表格内容或配置。");
			}
		} catch (error: any) {
			console.error("加载数据时发生未知错误:", error);
			setError(error.message || "加载数据失败，请重试。");
			setMilestones([]);
		} finally {
			setLoading(false);
		}
	}, []);

	// 配置变更处理 - 实时预览
	const handleConfigChange = useCallback(
		async (newConfig: STimelineConfig) => {
			setConfig(newConfig);

			// 如果在配置模式下，立即更新预览
			if (isConfig) {
				await loadData(newConfig, currentMode);
			}
		},
		[isConfig, currentMode, loadData]
	);

	// 保存配置
	const handleSave = useCallback(async () => {
		try {
			const dataManager = new TimelineDataManager(config, currentMode);
			const success = await dataManager.saveDataDependency();
			return success;
		} catch (error) {
			setError("保存配置失败，请重试。");
			return false;
		}
	}, [config, currentMode]);

	// 初始化和模式变化处理
	useEffect(() => {
		const initialize = async () => {
			try {
				setLoading(true);

				// 在展示模式下，必须先获取已保存的配置
				if (currentMode === DashboardMode.View || currentMode === DashboardMode.FullScreen) {
					const savedConfig = await dashboard.getConfig();
					if (savedConfig?.customConfig) {
						// 使用获取到的配置来加载数据
						const newConfig = { ...getDefaultConfig(), ...savedConfig.customConfig };
						setConfig(newConfig);
						await loadData(newConfig, currentMode);
					} else {
						// 没有保存的配置，可以显示错误或空状态
						console.warn("在视图模式下未找到已保存的配置");
						setError("未找到配置，请先在配置模式下保存。");
						setMilestones([]);
					}
				} else {
					// 创建/配置模式，使用当前的 config 状态（通常是默认值或正在修改的值）
					await loadData(config, currentMode);
				}
			} catch (error) {
				console.error("初始化失败:", error);
				setError("插件初始化失败");
				setMilestones([]); // 加载失败时不应显示模拟数据
			} finally {
				setLoading(false);
			}
		};

		initialize();
	}, [currentMode]);

	// 监听数据变化
	useEffect(() => {
		const cleanup = dashboard.onDataChange(async () => {
			if (currentMode === DashboardMode.View || currentMode === DashboardMode.FullScreen) {
				await loadData(config, currentMode);
			}
		});

		return cleanup;
	}, [config, currentMode, loadData]);

	// 监听容器大小变化
	useEffect(() => {
		if (!containerRef.current) return;

		const updateSize = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const newSize = { width: rect.width, height: rect.height };

				// 只有在尺寸真正发生变化时才更新
				if (
					Math.abs(newSize.width - actualContainerSize.width) > 5 ||
					Math.abs(newSize.height - actualContainerSize.height) > 5
				) {
					setActualContainerSize(newSize);
				}
			}
		};

		// 初始化尺寸
		updateSize();

		// 创建 ResizeObserver
		if (window.ResizeObserver) {
			resizeObserverRef.current = new ResizeObserver(() => {
				updateSize();
			});
			resizeObserverRef.current.observe(containerRef.current);
		}

		// 监听窗口大小变化作为备用
		const handleResize = () => updateSize();
		window.addEventListener("resize", handleResize);

		return () => {
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect();
			}
			window.removeEventListener("resize", handleResize);
		};
	}, [actualContainerSize]);

	// 配置模式包括创建和配置状态
	const isConfigMode = isConfig;

	return (
		<div ref={containerRef} className={`s-timeline-dashboard mode-${currentMode}`}>
			{error && (
				<div className="error-overlay">
					<div className="error-content">
						<h3>数据加载失败</h3>
						<p>{error}</p>
					</div>
				</div>
			)}

			{isConfigMode ? (
				// 配置模式：左侧预览，右侧配置
				<div className="config-layout">
					<div className="timeline-preview">
						<TimelineRenderer milestones={milestones} config={config} containerSize={actualContainerSize} />
					</div>
					{/* 配置面板只在配置模式下渲染 */}
					{isConfig && (
						<div className="config-panel-wrapper">
							<ConfigPanel
								config={config}
								onConfigChange={handleConfigChange}
								onSave={handleSave}
								loading={loading}
							/>
						</div>
					)}
				</div>
			) : (
				// 查看模式：全屏显示
				<div className="view-layout">
					<TimelineRenderer milestones={milestones} config={config} containerSize={actualContainerSize} />
				</div>
			)}
		</div>
	);
};

export default TimelineDashboard;
