import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setDataBaseDir } from "@zcode/services/node";

/**
 * 定制版 fork 数据隔离(与官方闭源版并排运行):
 *
 * - 默认数据基目录固定为 ~/.zcode-sakura-home(数据根 = 其下 .zcode),
 *   会话/设置/凭据与官方版 ~/.zcode 完全分离,双开不再互抢 SQLite 锁或串任务;
 * - 设置页配置的数据目录迁移(setting.json dataBaseDir)改为从 fork 自己的
 *   默认目录读取,不会读到官方版的迁移配置;
 * - 环境变量 ZCODE_DATA_BASE_DIR 仍是最高优先级逃生口(README 文档化行为),
 *   显式设置时不注入 fork 默认值。
 * 同时写入 process.env,保证 host/scheduler/agent 子进程在自身模块加载期
 * 捕获到同一个值(paths.ts 在模块加载时缓存该 env)。
 */
const FORK_DEFAULT_DATA_BASE_DIR_NAME = ".zcode-sakura-home";

function resolveForkDefaultDataBaseDir(homePath: string = homedir()): string {
  return join(homePath, FORK_DEFAULT_DATA_BASE_DIR_NAME);
}

function resolveBootstrapSettingsFile(dataBaseDir: string): string {
  return join(dataBaseDir, ".zcode", "v2", "setting.json");
}

function extractBootstrapDataBaseDir(rawValue: unknown): string | null {
  if (!rawValue || typeof rawValue !== "object") {
    return null;
  }

  const dataBaseDir = (rawValue as { dataBaseDir?: unknown }).dataBaseDir;
  if (typeof dataBaseDir !== "string") {
    return null;
  }

  const trimmed = dataBaseDir.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBootstrapDataBaseDirFromDisk(settingsFile: string): string | null {
  if (!existsSync(settingsFile)) {
    return null;
  }

  try {
    const raw = readFileSync(settingsFile, "utf-8");
    return extractBootstrapDataBaseDir(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function applyEarlyDataBaseDirBootstrap(): string | null {
  if (process.env.ZCODE_DATA_BASE_DIR?.trim()) {
    // 显式 env 优先,保持文档化的开发隔离流程不变。
    return null;
  }

  const forkDefaultDataBaseDir = resolveForkDefaultDataBaseDir();
  // 启动早期就把 dataBaseDir 注入进来，避免 logger / crashReporter 先按默认 HOME 建目录，
  // 导致后续再切换到自定义目录时，日志和 crash dump 落在两套路径里。
  const dataBaseDir =
    readBootstrapDataBaseDirFromDisk(resolveBootstrapSettingsFile(forkDefaultDataBaseDir)) ??
    forkDefaultDataBaseDir;
  setDataBaseDir(dataBaseDir);
  process.env.ZCODE_DATA_BASE_DIR = dataBaseDir;
  return dataBaseDir;
}
