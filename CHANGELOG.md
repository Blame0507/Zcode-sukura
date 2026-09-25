# 更新日志

本项目(ZCode Sakura)是 [ZCode](https://github.com/zai-org/zcode)(Apache-2.0)的个人定制桌面版分支。本日志记录分支相对上游的改动;上游自身的功能更新以[上游仓库](https://github.com/zai-org/zcode)为准。

## [3.14.3-sakura] - 2026-09-24

### 同步上游

- **合入官方 3.14.3 全部更新**,分支基于 3.14.0 → 3.14.3。上游新增内容全部保留:
  - 动态工作流(workflow runs)系统增强:运行重调(retune)、静默判定、席位门控、工件主链路等
  - 「自动化」机器人功能(BotsDialog + bots 服务)
  - `bundled-skills` 技能包(dynamic-workflows 使用指南随源码开源)
  - WebRemoteControl 对话框、workflow 相关 UI 组件
  - 会话索引扇出节流等稳定性改进
- 上游仍随包发行的 Web / 独立命令行产品线(`packages/web`、`packages/zcode-server-cli`、`build:zcode` 脚本)按分支定位**再次移除**,专注桌面版。

### 新增

- **自定义对话区背景图**(设置 → 外观 → 对话区背景图):
  - 系统文件选择框选图,支持 png/jpg/jpeg/webp/gif/bmp,单张 ≤ 20MB
  - 图片保存在隔离数据根 `~/.zcode-sakura-home/.zcode/wallpaper/`,选新图自动覆盖
  - 通过 `--zcode-conversation-wallpaper` CSS 变量覆盖主题默认壁纸,启动时自动恢复
  - 一键「恢复默认」回到内置樱花壁纸
  - 新增桌面命令 `chooseConversationWallpaper` / `clearConversationWallpaper` / `getConversationWallpaper`

### 新增(第二轮)

- **星夜(Starry Night)主题**:雪山星空湖景参考图配色,深夜蓝暗色系全套 token 映射 + 内置壁纸层 + 星辉蓝渐变按钮
- **主题化应用 logo**:左上角 logo 改为 CSS 变量驱动的内联 SVG 组件(`ZCodeLogo`),随主题换色——官方浅/深色=黑、樱花粉=粉渐变、深海蓝=蓝渐变、星夜=星辉蓝渐变

### 修复(第二轮)

- **主题切换无反应**:外观页主题白名单硬编码遗漏 `sakura`/`deepseek`(及新增主题),选中后被静默丢弃;白名单已补全并在后续新增主题时同步维护

### 数据隔离加固

- 用户级文件全部改为跟随应用数据根解析(官方构建语义不变,仍等于真实 HOME):
  - 技能 / 命令 / hooks / MCP 兼容目录 / 子代理存储 / 设置 / 设置同步 / 插件存储(services 侧 `getDataBaseDir()`)
  - Agent 运行时的用户级技能、命令、AGENTS.md 用户指令(adapters 侧 `ZCODE_DATA_BASE_DIR` 环境变量)
  - 配置路径 `~` 展开枢纽同样优先数据根
- 效果:隔离实例不再读写真实 HOME 下其他版本的任何用户级文件(此前曾把数据目录设置串写进其他版本的配置导致其数据根被改,本修复根治该类问题)

### 修复 / 适配

- 合并过程中补回被上游覆盖冲掉的分支接线:`getIssuesUrlFromConfig` 导出(issue 反馈链接)等
- 上游对 `platform.ts`(Bot 事件)与 `index.ts` 的更新与分支定制并存,逐块核对后合并
- 根 `package.json` 移除上游回归的 `dev:web` / `build:zcode` 脚本,`typecheck` 脚本同步裁剪

### 验证

- 全仓 TypeScript 类型检查通过;Windows x64 打包成功(145 MB)
- 安装包解剖确认:樱花主题 CSS、壁纸变量、花瓣动画、数据隔离、更新通道禁用、issue 链接、自定义壁纸命令全部在包内
- 运行日志确认:启动时壁纸恢复命令走通全链路,数据目录仍指向隔离根

## [3.14.0-sakura] - 2026-09-22 ~ 2026-09-23

### 樱花主题(分支默认主题)

- 粉白色樱花主题色系(`.theme-sakura` 语义 token 块),开箱即用
- 对话区飘落樱花动画(100 粒,纯 transform/opacity 合成器动画,低功耗;`prefers-reduced-motion` 自动关闭)
- 对话区壁纸层:参考图作为背景,3px 模糊 + 45% 透明度与主题渐变融合,拉伸铺满
- 主题切换 300ms 平滑过渡(`.theme-switching` 临时类)
- 品牌视觉:粉底白字 logo(135° 粉渐变 + 白色 Z + 玻璃描边),全套应用图标(安装器/托盘/运行时/README 头图)同步重绘

### 数据与官方版完全隔离

- 产品身份 ZCode Sakura(appId `dev.zcode.app.sakura`),数据根固定 `~/.zcode-sakura-home/.zcode`
- 与官方闭源版并排安装、双开互不干扰:会话、设置、凭据、日志、SQLite 全部独立
- `ZCODE_DATA_BASE_DIR` 环境变量仍为最高优先级逃生口

### 更新通道与 Issue 链接

- 应用内更新检查默认彻底禁用(不再请求官方发布服务,消除版本号落后导致的无关推送)
- 可选指向自己的 GitHub Releases:`update-from-upstream.mjs --setup <repo>` 写入配置 + 打包后即生效
- 上游同步脚本(git 合并式,支持 `--check/--apply/--rebuild/--install-schedule` 每日计划任务)
- 帮助菜单「问题反馈」可配置直达自己仓库的 GitHub Issue 页

### 社区 Skill 方案(不依赖非开源官方插件)

- 移除官方市场非开源插件(Z.ai 非商业许可/无许可证的 12 个),启用状态在配置中写死防止自动重装
- 保留许可证明确开源的插件:browser-use、node-repl-host(仓库自带)、computer-use(Apache-2.0)
- 文档/表格/演示/PDF/图片搜索由 MIT 社区技能替代,打包为本地插件 `community-skills`(`plugins.dirs` 注册,隔离数据根内,与官方版互不可见),每个技能附 `SOURCE.txt` 标注上游

