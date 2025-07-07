当前 SDK 处于内测状态，随时可能发生变更，请密切关注文档变更及开发群通知

具体文档地址：
https://lark-base-team.github.io/js-sdk-docs/zh/

模块说明
Dashboard 模块主要用于仪表盘插件的开发，该模块提供了仪表盘插件特有的配置和计算接口。
需要注意的是：
- Dashboard 模块仅用于仪表盘插件，其他点位的插件无法调用该模块的接口。
- 仪表盘插件可以调用 JSSDK 其他模块中的接口，但极少部分接口的返回和其他点位有不一致的情况出现，具体请参考具体接口文档中的备注。
环境准备
入口与SDK
用以下命令进行安装内测版本的 JSSDK：
npm install @lark-base-open/js-sdk@0.4.0-alpha.1
Dashboard 模块拥有独立的统一入口 dashboard，引入方式如下：
import { dashboard } from '@lark-base-open/js-sdk';

const config = await dashboard.getConfig();
// ...
使用统一ui库（React项目）
为了保持插件的ui一致性，我们基于semi定制了一套ui样式，请参考如下方式引入:
首先安装所需要的依赖包
npm i @douyinfe/semi-ui @semi-bot/semi-theme-feishu-dashboard vite-plugin-semi-theming @douyinfe/semi-foundation
在vite项目中接入
然后修改vite.config.js:
[图片]

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { semiTheming } from "vite-plugin-semi-theming";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        react(),
        semiTheming({
            theme: "@semi-bot/semi-theme-feishu-dashboard",
        }),
    ],
    server: {
        host: "0.0.0.0",
    },
});


在webpack项目中接入
安装webpack插件：
npm i @douyinfe/semi-webpack-plugin
然后使用插件：
// webpack.config.js
const SemiWebpackPlugin = require('@douyinfe/semi-webpack-plugin').default;
plugins: [
  new SemiWebpackPlugin({
    theme: '@semi-bot/semi-theme-feishu-dashboard',
    include: '~@semi-bot/semi-theme-feishu-dashboard/scss/local.scss'
  })
]


在 NextJs 项目接入
- 当你在 Next.js 项目中使用 Semi 时，需要搭配 Semi 提供的编译插件（由于 Next.js 不允许 npm 包从 node_modules 中 import 样式文件，需要配合插件将默认的import CSS 语句移除，并且手动引入 CSS）
1. 配置 Semi Next Plugin
// next.config.js
const semi = require('@douyinfe/semi-next').default({
    /* the extension options */
});
module.exports = semi({
// your custom Next.js configuration
});

2. 手动引入主题 在 global.css 中引入全量的 semi css
/* styles/globals.css */
@import '~@douyinfe/semi-ui/dist/css/semi.min.css'; // 当你希望使用 Semi 默认主题时，直接从 semi-ui 中引即可

@import '~@semi-bot/semi-theme-feishu-dashboard/semi.min.css'; 

快速开始
示例（React）：倒计时
- 仓库地址：
  - Github: https://github.com/Lark-Base-Team/Count-Down
  - Replit: https://replit.com/@lark-base/Count-Down
- 预览链接（同插件市场）：https://ext.baseopendev.com/ext/count-down/4a822c1ce8e081e4e8c29f7a0d1e7975e81c63a1/index.html

示例（React）：雷达图
- 仓库地址：
  - Github: https://github.com/Lark-Base-Team/radar_chart_demo
  - Replit: https://replit.com/@lark-base/radarchartdemo
- 预览链接：https://ext.baseopendev.com/ext/radar_chart_demo/20725d33fa44b1e1ba41c78bacb2e0c1e37828b2/index.html
仪表盘插件状态
仪表盘插件和官方图表一样存在多个状态，你需要在插件代码中感知多个不同状态并做出相应的处理。
enum DashboardState {
    Create = 'Create', // 创建状态
    Config = 'Config', // 配置状态
    View = 'View', // 展示状态
    FullScreen = 'FullScreen' // 全屏状态
}
创建状态
[图片]
图表首次添加至仪表盘时，插件处于创建状态，创建状态下插件相关数据并未落库，因此无法调用 getConfig 和 getData 方法。除了初始化逻辑存在差异，创建状态和配置状态逻辑基本一致。
配置状态
[图片]
[图片]
在配置状态下用户可以对右侧配置进行修改，插件左侧图表需要跟随右侧配置的变更实时渲染，渲染数据可通过 getPreviewData 接口进行获取。
展示状态
[图片]
[图片]
展示状态下插件需要隐藏配置相关内容，仅渲染图表相关内容即可。同时展示状态下插件的渲染数据需要通过 getData 接口进行获取，配置和展示这两个状态是互斥的。
全屏状态
[图片]
全屏状态下的插件需要适配深色模式；
全屏状态下，为使用透明背景色，需保证插件的html和body为透明，参考引入以下样式：
html,
body {
    background: transparent !important;
    background-image: none !important;
}

API
state
当前插件所处的状态，具体请参考仪表盘插件状态中的描述。
get state(): DashboardState
getTableList
获取当前 Base 下的所有数据表信息可直接使用原 Base 模块的接口，Dashboard 模块不做额外拓展
import { base } from '@lark-base-open/js-sdk';

const tableList = await base.getTableList();
getTableDataRange
获取指定数据表的数据范围，目前支持「全部数据范围」和「视图数据范围」。
getTableDataRange: () => Promise<IDataRange[]>;
数据范围定义如下：
// 数据范围
type IDataRange = AllDataRange | ViewDataRange;

interface AllDataRange {
  type: SourceType.ALL;
  filterInfo?: IFilterInfo;
}

interface ViewDataRange {
  type: SourceType.VIEW;
  viewId: string;
  viewName: string;
  filterInfo?: IFilterInfo;
}
getCategories
获取指定数据表的分类（字段）信息。
getCategories(tableId: string): Promise<ICategory[]>;

interface ICategory {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
}
getConfig
获取仪表盘插件配置，包含数据源配置和插件自定义配置，在创建模式(dashboard.state === DashboardState.Create时)下调用会抛出错误。
getConfig: () => Promise<IConfig>

interface IConfig {
  dataConditions: IDataCondition | IDataCondition[]; // 数据源配置，当前版本仅支持一组条件
  //如果插件配置依赖表结构则必须在 dataConditions 中存储 tableId，以保证在创建副本时一放能进行映射替换
  customConfig?: Record<string, unknown>; // 自定义配置
}
数据源类型定义（建议结合柱状图、饼图等图表的配置 UI 进行理解）：
interface IDataCondition {
  tableId: string; // 数据源表
  dataRange?: IDataRange; // 数据范围（全部、视图）
  groups?: IGroupItem[]; // 分组信息
  series?: ISeries[] | 'COUNTA'; // 系列，指的是字段的计算方式

// 分组
interface IGroupItem {
  fieldId: string; // 分组依据的字段
  sort?: ISort; // 每个分组的排序规则
  mode?: GroupMode; // 分组模式，分组字段为多选时可进行配置
}

// 分组排序规则
interface ISort {
  order?: ORDER; // 正序/倒序
  sortType: DATA_SOURCE_SORT_TYPE; // 排序方式
}

enum DATA_SOURCE_SORT_TYPE {
  VALUE = 'VALUE', // 按计算结果的值进行排序（如统计的是记录总数，则按照记录总数进行排序）
  VIEW = 'VIEW', // 按记录顺序排序
  GROUP = 'GROUP', // 按分组字段类别进行排序（如用数字字段进行分组，则用数字大小进行排序）
}

// 字段计算方式
interface ISeries {
  fieldId: string;
  rollup: Rollup; // 求和、平均、最大、最小
}

// 分组模式
export enum GroupMode {
  ENUMERATED = 'enumerated', // 拆分统计，“A,B,C” -> A | B | C
  INTEGRATED = 'integrated', // 不拆分统计，“A,B,C” -> “A,B,C”
}

// 计算方式
enum Rollup {
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  COUNTA = 'COUNTA',
  MAX = 'MAX',
  MIN = 'MIN',
}
saveConfig
保存配置，通常在插件处于配置状态且用户修改并保存配置后调用，调用该接口会关闭配置弹窗进入展示状态。
saveConfig: (config: IConfig) => Promise<boolean>;
Config 定义同上述 getConfig。
getData
在展示状态(禁止用于配置状态，否则可能会出现意想不到的bug)获取计算结果，计算结果是一个通用的二维数组格式，开发者自行决定这一组数据的消费方式。在创建模式(dashboard.state === DashboardState.Create时)下调用会抛出错误，创建模式时请使用getPreviewData。
getData: () => Promise<IData>;
计算结果的类型定义如下：
type IData = IDataItem[][];

interface IDataItem {
  value: string | number | null;
  text: string | null;
  groupKey?: string;
}
为了便于理解该数据结构，下方提供一个从表格数据 => 计算结果 => 图表渲染的全过程的示例。
表格数据（学生成绩表）：
[图片]
计算条件——首先以性别字段作为分组依据，再将考试成绩作为第二个分组依据，计算结果如下：
[图片]
计算条件
// 数据结构
[
    [
        {value: '性别', text: '性别', groupKey: null},
        {value: 50, text: '50.0', groupKey: '50.0'},
        {value: 60, text: '60.0', groupKey: '60.0'},
        {value: 70, text: '70.0', groupKey: '70.0'}
    ],
    [
        {value: '男', text: '男', groupKey: '男'},
        {value: 1, text: '1', groupKey: null},
        {value: 1, text: '1', groupKey: null},
        {value: 2, text: '2', groupKey: null}
    ],
    [
        {value: '女', text: '女', groupKey: '女'},
        {value: 2, text: '2', groupKey: null},
        {value: 1, text: '1', groupKey: null},
        {value: 1, text: '1', groupKey: null}
    ],    
]
计算结果
用图例表达更易于理解：
暂时无法在飞书文档外展示此内容
计算数据，单元格中填充的是 text/value

[图片]
渲染结果（以柱状图为例）
能够很直观地看到以下特征：
- 二维数组的第一行表达的是分组 label
- 第一列是在表达分组的值（性别字段的值）
- 通过 label 和分组能够唯一确定一个待呈现数据的具体计算值（上述示例是统计记录总数）
getPreviewData
在配置状态(禁止用于展示状态，否则可能会出现意想不到的bug)获取用于预览的计算结果，注意接口入参仅需传递数据源配置，不需要传入插件自定义配置。
getPreviewData: (dataConditions: IDataCondition | IDataCondition[]) => Promise<IData>;
计算结果的数据结构与 getData 相同。
setRendered
渲染完成主动通知宿主。
为了保障你的插件能够在自动化发送中展示，请务必在插件渲染完成后调用该方法。
setRendered: () => Promise<boolean>;
事件
onDataChange
监听计算数据变更。
为了满足与一方图表相近的协同体验，插件图表在整个生命周期均需持有该监听方法。
onDataChange: (e: IEventCtx<IData>) => off;
使用细节：
1. 数据流向：
数据表/视图 => 仪表盘全局筛选 => setConfig中的filterInfo筛选 => onDataChange/getData最终获取到的数据
以上任意一个环节的变更，都会导致onDataChange触发。
onConfigChange
监听插件配置变更。
为了满足与一方图表相近的协同体验，插件图表在整个生命周期均需持有该监听方法。
onConfigChange: (e: IEventCtx<IConfig>) => off;
