# ZCode Sakura

<div align="center">
  <img src="public/logo/icons/1024x1024.png" alt="ZCode Sakura" width="128" height="128" />
</div>
<p align="center">
  简体中文 | <a href="README.en.md">English</a>
</p>

**ZCode Sakura** 是基于开源 [ZCode](https://github.com/zai-org/zcode)(Apache-2.0,当前同步至 **3.14.3**)的个人定制桌面版分支:樱花主题开箱即用、可自定义对话区背景图、与官方版数据彻底隔离、更新通道自主可控、技能全部来自社区开源实现。本分支只保留桌面版形态,专注做好一件事。

> 非官方分支,与 Z.ai 无隶属或被背书关系。上游的社区与支持渠道请访问上游仓库。各版本变化见 [CHANGELOG.md](CHANGELOG.md)。

## 这个分支做了什么

- **多主题**(默认樱花粉):樱花粉🌸 / 深海蓝(DeepSeek)🌊 / 星夜(MoonStar)✦ 三套定制主题 + 官方浅/深色;每套含专属配色、壁纸层、渐变按钮
- **主题化 logo**:左上角应用 logo 随主题换色(官方黑/樱花粉/深海蓝/星辉蓝)
- **樱花动画**:樱花主题下对话区飘落花瓣(纯合成器动画,低功耗,`prefers-reduced-motion` 自动关闭)
- **自定义背景图**:设置 → 外观 → 对话区背景图,任选本地图片(≤20MB)一键换壁纸、一键恢复默认,图片存于隔离数据根,重启自动恢复
- **品牌视觉**:粉底白字 logo 与全套应用图标(安装器/托盘/运行时)
- **数据彻底隔离**:数据根固定在 `~/.zcode-sakura-home/.zcode`,会话、设置、凭据、记忆、用户级技能/命令/hooks/子代理/插件全部随数据根分离——与官方闭源版并排安装、双开互不干扰、互不读写对方任何文件
- **更新自主**:默认禁用对官方发布服务的更新检查,可一键指向你自己的 GitHub Releases;附带基于 git 合并的上游同步脚本,升级不丢本地修改
- **社区技能方案**:不依赖官方市场的非开源插件,文档/PDF/表格/演示/图片搜索由 MIT 许可的社区 skill 提供
- **形态裁剪**:移除 Web 与独立命令行发行形态及其构建链,保留桌面版与 Agent CLI 源码

## 环境要求与初始化

准备 Git、Node.js **24.14.0** 和 pnpm **10.33.2**,版本以 [mise.toml](mise.toml) 为准。以下命令均在仓库根目录执行。

```bash
pnpm bootstrap
```

`pnpm bootstrap` 安装 workspace 依赖、准备桌面本地运行资源,再执行 `build:bootstrap`。Agent CLI 与运行时源码位于 [apps/zcode-cli/](apps/zcode-cli/),随仓库一起克隆,无需初始化 submodule。

| 命令                           | 用途                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `pnpm install`                 | 安装依赖                                                          |
| `pnpm prepare:desktop-runtime` | 准备桌面运行资源,默认包含远程资源准备                            |
| `pnpm prepare:remote-assets`   | 单独准备远程运行资源                                              |
| `pnpm bootstrap:with-remote`   | 初始化依赖、本地与远程资源,并串行构建相关包;跳过桌面应用 bundle |
| `pnpm build`                   | 递归执行各 workspace 包的构建脚本                                 |

默认 `bootstrap` 跳过远程资源准备,适合本地桌面开发。

## 开发与运行

### 桌面版

```bash
pnpm dev:desktop

# 使用测试环境
pnpm dev:desktop:test
```

启动脚本会准备本地运行资源、构建桌面 Agent,再启动 Electron 和源码监听。开发数据目录默认走本分支的隔离根;需要额外隔离时,可用环境变量 `ZCODE_DATA_BASE_DIR` 显式指定(优先级最高):

```bash
ZCODE_DATA_BASE_DIR="$HOME/.zcode-dev-home" pnpm dev:desktop:test
```

### 远程功能(SSH/WSL)

先执行 `pnpm bootstrap:with-remote` 准备远程资源(mock-cdn),再 `pnpm dev:desktop`;连接远程项目时资源选择「本地下载后上传」。开发态资源取自本地 `packages/desktop/mock-cdn` 和本地构建产物,不访问 CDN。

### Agent CLI 源码开发

```bash
pnpm --filter @zcode/cli dev --help
pnpm --filter @zcode/cli dev

# 构建 CLI 及其 workspace 依赖
pnpm --filter @zcode/cli... build
node apps/zcode-cli/packages/cli/dist/zcode.cjs --help
```

## 配置

根目录 [.env.example](.env.example) 提供服务地址与构建配置示例,可按需复制到 `.env`,本地覆盖放入 `.env.local`。Desktop 的开发环境通过 `dev:desktop:test` / `dev:desktop:prod` 选择。

| 配置                                 | 用途                                             |
| ------------------------------------ | ------------------------------------------------ |
| `ZCODE_DATA_BASE_DIR`                | 应用数据基目录(优先级最高,覆盖分支默认隔离根) |
| `ZCODE_BUILTIN_PROVIDER_CONFIG_FILE` | 本地 Provider 配置文件路径;未设置时使用内置配置 |
| `ZCODE_UPSTREAM_REPO`                | 临时覆盖上游同步脚本使用的仓库地址               |

运行时变量可在启动命令的环境中显式设置。随客户端发布的默认配置见 [config/README.md](config/README.md)。

## 打包(桌面版)

```bash
pnpm bundle:desktop

# 指定目标平台与 CPU 架构
pnpm bundle:desktop -- --os win --arch x64

pnpm bundle:desktop -- --help
```

默认目标为 macOS arm64,输出目录为 `packages/desktop/dist/`。`--os` 支持 `mac`、`win`、`linux`,`--arch` 支持 `x64`、`arm64`;实际打包与签名需要目标平台对应的工具和配置。

**Windows 构建提示**:Electron 二进制下载证书校验失败时,设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`;electron-builder 的 winCodeSign 缓存解包遇到符号链接权限错误(非管理员常见)时,手动把归档解压到 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\` 后重跑即可跳过下载。第三方声明材料见 [third-party/](third-party/)。

## 仓库结构

| 目录                                                 | 职责                                              |
| ---------------------------------------------------- | ------------------------------------------------- |
| `packages/desktop`                                   | Electron Main、Host、Renderer 与桌面打包          |
| `packages/ui`                                        | 共享 React 组件、hooks 与 Zustand 状态            |
| `packages/services`                                  | 业务服务与持久化                                  |
| `packages/server`                                    | 桌面本地 HTTP / WebSocket 服务                    |
| `packages/shared`、`packages/rpc`、`packages/client` | 共享协议和类型、RPC 框架、Agent 客户端 SDK        |
| `packages/provider`、`packages/provider-node`        | Provider 公共能力与 Node 实现                     |
| `apps/zcode-cli`                                     | Agent CLI、运行时、browser-use 等插件源码         |
| `scripts`、`config`、`third-party`                   | 构建维护脚本、内置配置与第三方声明材料            |

## 数据与官方版完全隔离

本构建的产品身份为 **ZCode Sakura**(appId `dev.zcode.app.sakura`),与官方闭源版并排安装、同时运行互不干扰:

- 数据根固定在 `~/.zcode-sakura-home/.zcode`(会话、设置、凭据、日志),不读写官方版的 `~/.zcode`,双开不再互抢 SQLite 锁或串任务/设置;
- Electron 数据目录(userData / localStorage / 更新缓存)随应用名 `ZCode Sakura` 独立;
- 环境变量 `ZCODE_DATA_BASE_DIR` 仍是最高优先级逃生口;设置页的「数据目录」迁移配置只从 fork 自己的 `setting.json` 读取;
- 本分支不再依赖官方市场的非开源插件(见下文社区技能方案),无需拷贝官方插件缓存。

## 上游同步与更新通道

本仓库是带本地定制的 fork,更新必须走 git 合并而不是覆盖目录,否则本地修改会丢失。[scripts/update-from-upstream.mjs](scripts/update-from-upstream.mjs) 封装了完整流程:

```bash
# 首次配置:保存上游仓库地址、添加 git remote、自动回填 issue 链接
node scripts/update-from-upstream.mjs --setup https://github.com/<你的用户名>/<你的仓库>

# 检查上游更新(默认动作,只读不改动)
node scripts/update-from-upstream.mjs --check

# 合并上游更新;冲突会列出文件并退出,需手动解决
node scripts/update-from-upstream.mjs --apply

# 合并成功后自动重新构建
node scripts/update-from-upstream.mjs --apply --rebuild

# 注册 Windows 每日 12:30 自动检查计划任务
node scripts/update-from-upstream.mjs --install-schedule
node scripts/update-from-upstream.mjs --uninstall-schedule
```

上游地址存于 [scripts/upstream.config.json](scripts/upstream.config.json)。Issue 反馈入口:帮助菜单「问题反馈」在 `config/default.json` 的 `issues_url` 配置后直接打开你的仓库 Issue 页,未配置时保持官方内置反馈表单。

应用内「检查更新」的更新源由 `config/default.json` 的 `update` 块控制:`owner`/`repo` 为空时**彻底禁用更新检查**(不对官方发布服务发起任何请求);`--setup` 写入你的 GitHub 仓库后,重新打包即从你的 Releases 检查更新——发布时把安装包、`latest.yml`、`.blockmap` 一起传到 Release 即可。

## 社区 Skill 方案

不依赖官方市场的非开源插件(文档四件套、image-search、skill-creator 等为 Z.ai 非商业许可或无许可证内容),功能由社区开源 skill 补齐:

| 功能              | 状态     | 来源与位置                                                             | 说明                                                                                     |
| ----------------- | -------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Word 文档         | ✅ 已装  | community-skills 插件 · docx-manipulation                              | python-docx,来自 [claude-office-skills/skills](https://github.com/claude-office-skills/skills)(MIT) |
| Excel 表格        | ✅ 已装  | community-skills 插件 · xlsx-manipulation                              | openpyxl,同上                                                                            |
| PPT 演示          | ✅ 已装  | community-skills 插件 · pptx-manipulation + ai-slides                  | python-pptx 直接产 .pptx;ai-slides 走 Marp 大纲成片                                      |
| PDF 处理          | ✅ 已装  | community-skills 插件 · pdf-converter / pdf-extraction / pdf-merge-split | 格式互转、内容提取、合并拆分                                                              |
| 图片搜索          | ✅ 已装  | community-skills 插件 · unsplash                                       | 来自 [cevatkerim/skills](https://github.com/cevatkerim/skills)(MIT);首次使用需免费 Unsplash API key |
| 网页自动化        | ✅ 内置  | 本仓库 `apps/zcode-cli/packages/browser-use-plugin`                    | Apache-2.0,源码随仓库提供                                                               |
| Node REPL 宿主    | ✅ 内置  | 本仓库 `node-repl-host` 包                                             | 浏览器/电脑控制插件的运行宿主                                                             |
| OS 级键鼠自动化   | ⚠️ 可选  | 官方 computer-use 插件                                                 | Z.ai 出品(plugin.json 声明 MIT,源码未公开、不在公开市场目录);介意来源非社区可不装    |

安装方式(纯配置,无代码修改):技能打包为本地插件 `community-skills`,放在隔离数据根 `~/zcode-plugins/community-skills`,通过 `~/.zcode-sakura-home/.zcode/cli/config.json` 的 `plugins.dirs` 注册(inline 插件默认启用),与官方版互不可见。每个技能目录附 `SOURCE.txt` 标注上游仓库与 MIT 许可。

新装用户提示:browser-use、node-repl-host 可在官方市场公开列表安装;computer-use 不在公开市场目录,缺失仅影响 OS 级控制,浏览器自动化不受影响。

## 已知差异(相对官方闭源版)

- 闭源原生的 CUA 屏幕控制通道(带签名信任门)在自建未签名构建中不可用;OS 级控制的技能引导仍在,日常网页场景由 browser-use 覆盖

## 声明与许可

- 本项目为个人定制的非官方分支,与 Z.ai 无隶属、合作或被背书关系;"ZCode" 名称与相关标识的权利归其权利人所有
- **双许可**:上游派生部分遵循 Apache-2.0(见 [LICENSE](LICENSE) 与 [NOTICE.md](NOTICE.md));本分支的修改与新增部分(主题、品牌、数据隔离、壁纸设置、同步工具等)同时以 MIT 提供,见 [LICENSE-MIT](LICENSE-MIT)
- 樱花壁纸 `sakura-bg.png`、深海蓝与星夜壁纸及主题视觉为本分支自制/自有素材;community-skills 插件内技能均为 MIT 许可,来源见各技能目录 `SOURCE.txt`
- 提交历史使用 noreply 邮箱,不含个人信息

## 发布前检查清单

公开发布本仓库或安装包前,逐项确认:

1. **品牌与命名**(可选):如需规避商标问题,可改名(如 "Sakura Code")并替换 Z 字图形;改名需同步 `desktop-product-identity.mjs`(appId/productName)与打包配置
2. **安装包**:Release 挂载的 exe 会包含全套视觉素材与品牌命名,出包前完成上一步的决策
3. **凭据与本地数据**:`~/.zcode-sakura-home` 与构建产物 `dist/` 永不提交、永不随包分发(当前已确认仓库内无任何凭据/个人信息)
