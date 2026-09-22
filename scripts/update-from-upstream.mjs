#!/usr/bin/env node
/**
 * ZCode 定制版:上游仓库自动更新脚本
 *
 * 本仓库是带本地定制的 fork(樱花主题、裁剪等),更新必须走 git 合并而不是直接覆盖,
 * 以保留本地修改。脚本从 scripts/upstream.config.json 读取上游配置。
 *
 * 用法:
 *   node scripts/update-from-upstream.mjs --setup <repo-url>    首次配置:保存仓库地址、添加 git remote、回填 issue 链接
 *   node scripts/update-from-upstream.mjs --check               检查上游是否有更新(默认动作)
 *   node scripts/update-from-upstream.mjs --apply               合并上游更新(冲突时会列出文件并退出,需手动解决)
 *   node scripts/update-from-upstream.mjs --apply --rebuild     合并成功后自动 pnpm bootstrap 重新构建
 *   node scripts/update-from-upstream.mjs --install-schedule    注册 Windows 计划任务(每天 12:30 自动 --check)
 *   node scripts/update-from-upstream.mjs --uninstall-schedule  移除计划任务
 *   --log                                                       把结果追加到 scripts/upstream-update.log
 *
 * 环境变量 ZCODE_UPSTREAM_REPO 可临时覆盖配置文件中的仓库地址。
 * 上游仓库格式:https://github.com/owner/repo 或 owner/repo。
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..");
const CONFIG_PATH = join(SCRIPT_DIR, "upstream.config.json");
const LOG_PATH = join(SCRIPT_DIR, "upstream-update.log");
const LOCAL_APP_CONFIG_PATH = join(REPO_ROOT, "config", "default.json");
const SCHEDULE_TASK_NAME = "ZCodeUpstreamUpdate";
const SCHEDULE_TASK_TIME = "12:30";
const SCHEDULE_WRAPPER_PATH = join(SCRIPT_DIR, "update-from-upstream-task.cmd");

const argv = process.argv.slice(2);
const hasFlag = (flag) => argv.includes(flag);
const setupArg = argv.includes("--setup") ? argv[argv.indexOf("--setup") + 1] : undefined;

function log(line) {
  console.log(line);
  if (hasFlag("--log")) {
    try {
      appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`, "utf8");
    } catch {
      // 日志失败不影响主流程
    }
  }
}

function run(file, args, options = {}) {
  const result = spawnSync(file, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return { repo: "", branch: "main" };
  }
  try {
    return { branch: "main", ...JSON.parse(readFileSync(CONFIG_PATH, "utf8")) };
  } catch (error) {
    console.error(`[upstream] 配置文件解析失败:${CONFIG_PATH}`);
    throw error;
  }
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

/** 把 owner/repo 或完整 URL 归一化为 https://github.com/owner/repo */
function normalizeRepoUrl(input) {
  if (!input) return undefined;
  const shorthand = input.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (shorthand) {
    return `https://github.com/${shorthand[1]}/${shorthand[2]}`;
  }
  const full = input.match(/^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (full) {
    return `https://github.com/${full[1]}/${full[2]}`;
  }
  return undefined;
}

function repoIssuesUrl(repoUrl) {
  return repoUrl ? `${repoUrl}/issues` : undefined;
}

function resolveRepo(config) {
  return config.repo || process.env.ZCODE_UPSTREAM_REPO || "";
}

function ensureGitReady() {
  const inside = run("git", ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.stdout !== "true") {
    console.error(`
[upstream] 当前目录不是 git 仓库。首次使用请先建立基线(保留本地定制的正确姿势):

  cd "I:\\glm 5.3\\ZCode-main"
  git init
  git add -A
  git commit -m "baseline: zcode 3.14.0 + local customizations"

然后重新运行本脚本。`);
    process.exit(1);
  }
}

function ensureUpstreamRemote(repoUrl) {
  const remotes = run("git", ["remote"]);
  if (!remotes.ok) {
    console.error(`[upstream] git remote 查询失败:${remotes.stderr}`);
    process.exit(1);
  }
  const names = remotes.stdout.split(/\r?\n/).filter(Boolean);
  if (names.includes("upstream")) {
    const current = run("git", ["remote", "get-url", "upstream"]);
    if (current.ok && current.stdout && current.stdout !== repoUrl) {
      const set = run("git", ["remote", "set-url", "upstream", repoUrl]);
      if (!set.ok) {
        console.error(`[upstream] 更新 remote 地址失败:${set.stderr}`);
        process.exit(1);
      }
      log(`[upstream] remote upstream 已指向 ${repoUrl}`);
    }
    return;
  }
  const add = run("git", ["remote", "add", "upstream", repoUrl]);
  if (!add.ok) {
    console.error(`[upstream] 添加 remote upstream 失败:${add.stderr}`);
    process.exit(1);
  }
  log(`[upstream] 已添加 remote upstream -> ${repoUrl}`);
}

function patchLocalAppConfigIssuesUrl(issuesUrl) {
  if (!existsSync(LOCAL_APP_CONFIG_PATH)) {
    console.warn(`[upstream] 未找到 ${LOCAL_APP_CONFIG_PATH},跳过 issue 链接回填`);
    return;
  }
  const config = JSON.parse(readFileSync(LOCAL_APP_CONFIG_PATH, "utf8"));
  if (config.issues_url === issuesUrl) {
    return;
  }
  config.issues_url = issuesUrl;
  writeFileSync(LOCAL_APP_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  log(`[upstream] config/default.json issues_url -> ${issuesUrl}(帮助菜单「问题反馈」将打开 GitHub Issue)`);
}

/**
 * 把 config/default.json 的 update 块指向 GitHub 仓库 Releases。
 * 写入后需重新打包,应用内「检查更新」才会走自己的仓库;
 * 未写入前 update 块为空,应用内更新检查保持彻底禁用。
 */
function patchLocalAppConfigUpdateFeed(repoUrl) {
  if (!existsSync(LOCAL_APP_CONFIG_PATH)) {
    console.warn(`[upstream] 未找到 ${LOCAL_APP_CONFIG_PATH},跳过更新源回填`);
    return;
  }
  const match = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
  if (!match) {
    console.warn(`[upstream] 无法从 ${repoUrl} 解析 owner/repo,跳过更新源回填`);
    return;
  }
  const config = JSON.parse(readFileSync(LOCAL_APP_CONFIG_PATH, "utf8"));
  config.update = { provider: "github", owner: match[1], repo: match[2] };
  writeFileSync(LOCAL_APP_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  log(`[upstream] config/default.json update -> github:${match[1]}/${match[2]}(重新打包后应用内更新走你的仓库 Releases)`);
}

function fetchUpstream() {
  const fetch = run("git", ["fetch", "upstream", "--prune", "--quiet"]);
  if (!fetch.ok) {
    console.error(`[upstream] git fetch 失败:${fetch.stderr || fetch.stdout}`);
    process.exit(1);
  }
}

function checkUpstreamBranch(config) {
  const ref = `upstream/${config.branch}`;
  const resolve = run("git", ["rev-parse", "--verify", "--quiet", ref]);
  if (!resolve.ok) {
    console.error(`[upstream] 上游不存在分支 ${config.branch}。请确认 scripts/upstream.config.json 的 branch 字段。`);
    process.exit(1);
  }
  return ref;
}

function reportBehind(ref) {
  const count = run("git", ["rev-list", "--count", `HEAD..${ref}`]);
  if (!count.ok) {
    console.error(`[upstream] 统计落后提交失败:${count.stderr}`);
    process.exit(1);
  }
  const behind = Number(count.stdout) || 0;
  if (behind === 0) {
    log("[upstream] 已是最新,本地与上游同步。");
    return 0;
  }
  log(`[upstream] 本地落后上游 ${behind} 个提交:`);
  const summary = run("git", ["log", "--oneline", "--decorate=no", `HEAD..${ref}`]);
  for (const line of summary.stdout.split(/\r?\n/).filter(Boolean).slice(0, 20)) {
    console.log(`    ${line}`);
  }
  if (behind > 20) {
    console.log(`    …(其余 ${behind - 20} 个省略)`);
  }
  console.log("\n执行以下命令应用更新(冲突需手动解决后重新构建):");
  console.log('  node scripts/update-from-upstream.mjs --apply --rebuild');
  return behind;
}

function applyUpstream(ref) {
  const merge = run("git", ["merge", "--no-edit", ref], { stdio: "inherit" });
  if (!merge.ok) {
    const conflicts = run("git", ["diff", "--name-only", "--diff-filter=U"]);
    console.error("\n[upstream] 合并出现冲突,以下文件需要手动处理:");
    for (const file of conflicts.stdout.split(/\r?\n/).filter(Boolean)) {
      console.error(`    ${file}`);
    }
    console.error(`
解决步骤:
  1. 编辑上述文件解决冲突
  2. git add <文件> && git commit
  3. 重新运行 node scripts/update-from-upstream.mjs --rebuild
如需放弃本次合并: git merge --abort`);
    if (hasFlag("--log")) {
      log("[upstream] 合并冲突,需手动解决。");
    }
    process.exit(1);
  }
  log("[upstream] 合并完成。");
}

function rebuild() {
  log("[upstream] 开始重新构建(pnpm bootstrap,耗时较长)…");
  const build = run("pnpm", ["bootstrap"], { stdio: "inherit" });
  if (!build.ok) {
    console.error("[upstream] 构建失败,请检查上方输出;也可手动执行 pnpm bootstrap。");
    process.exit(1);
  }
  log("[upstream] 构建完成。重启 dev:desktop / 重新打包即可使用新版本。");
}

function writeScheduleWrapper() {
  const nodeExe = process.execPath;
  const lines = [
    "@echo off",
    `"${nodeExe}" "${join(SCRIPT_DIR, "update-from-upstream.mjs")}" --check --log`,
  ];
  writeFileSync(SCHEDULE_WRAPPER_PATH, `${lines.join("\r\n")}\r\n`, "utf8");
}

function installSchedule() {
  writeScheduleWrapper();
  if (process.platform !== "win32") {
    console.log(`[upstream] 非 Windows 平台请自行配置 cron,示例(每日 12:30):`);
    console.log(`  30 12 * * * cd "${REPO_ROOT}" && node scripts/update-from-upstream.mjs --check --log`);
    return;
  }
  const quotedTr = `"${SCHEDULE_WRAPPER_PATH}"`;
  const create = run("schtasks", [
    "/Create",
    "/F",
    "/TN",
    SCHEDULE_TASK_NAME,
    "/SC",
    "DAILY",
    "/ST",
    SCHEDULE_TASK_TIME,
    "/TR",
    quotedTr,
  ]);
  if (!create.ok) {
    console.error(`[upstream] 计划任务创建失败:${create.stderr || create.stdout}`);
    process.exit(1);
  }
  log(`[upstream] 已注册每日 ${SCHEDULE_TASK_TIME} 的检查任务(${SCHEDULE_TASK_NAME});结果写入 scripts/upstream-update.log。`);
  console.log("手动触发测试: schtasks /Run /TN " + SCHEDULE_TASK_NAME);
}

function uninstallSchedule() {
  if (process.platform !== "win32") {
    console.log("[upstream] 非 Windows 平台,无已注册计划任务。");
    return;
  }
  const remove = run("schtasks", ["/Delete", "/F", "/TN", SCHEDULE_TASK_NAME]);
  if (!remove.ok) {
    console.error(`[upstream] 计划任务删除失败(可能本就不存在):${remove.stderr || remove.stdout}`);
    return;
  }
  log("[upstream] 已移除计划任务。");
}

function runSetup() {
  const repoUrl = normalizeRepoUrl(setupArg);
  if (!repoUrl) {
    console.error("[upstream] --setup 需要仓库地址,如:--setup https://github.com/your-name/zcode");
    process.exit(1);
  }
  const config = loadConfig();
  config.repo = repoUrl;
  saveConfig(config);
  log(`[upstream] 已保存上游仓库:${repoUrl}(分支 ${config.branch})`);
  // issue 链接回填不依赖 git,先于 git 检查执行,保证无 git 仓库时也能完成配置。
  const issuesUrl = repoIssuesUrl(repoUrl);
  if (issuesUrl) {
    patchLocalAppConfigIssuesUrl(issuesUrl);
    patchLocalAppConfigUpdateFeed(repoUrl);
  }
  ensureGitReady();
  ensureUpstreamRemote(repoUrl);
  console.log("\n后续步骤:");
  console.log("  node scripts/update-from-upstream.mjs --check             检查更新");
  console.log("  node scripts/update-from-upstream.mjs --install-schedule  每日自动检查");
}

function main() {
  if (setupArg !== undefined || argv.includes("--setup")) {
    runSetup();
    return;
  }
  const config = loadConfig();
  const repoUrl = normalizeRepoUrl(resolveRepo(config));
  if (!repoUrl) {
    console.error(`[upstream] 未配置上游仓库。两种方式任选:
  1. node scripts/update-from-upstream.mjs --setup https://github.com/your-name/zcode
  2. 编辑 ${CONFIG_PATH} 填写 repo 字段(或设置环境变量 ZCODE_UPSTREAM_REPO)`);
    process.exit(1);
  }
  if (hasFlag("--install-schedule")) {
    installSchedule();
    return;
  }
  if (hasFlag("--uninstall-schedule")) {
    uninstallSchedule();
    return;
  }
  ensureGitReady();
  ensureUpstreamRemote(repoUrl);
  fetchUpstream();
  const ref = checkUpstreamBranch(config);
  const behind = reportBehind(ref);
  if (behind > 0 && hasFlag("--apply")) {
    applyUpstream(ref);
    if (hasFlag("--rebuild")) {
      rebuild();
    }
  }
}

main();
