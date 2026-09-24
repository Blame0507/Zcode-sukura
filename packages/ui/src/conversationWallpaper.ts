import { DesktopCommandIds, type IPlatformService } from "@zcode/shared";

/**
 * 定制版 fork:对话区自定义背景图。
 * 主进程把用户选择的图片存进隔离数据根 wallpaper/ 目录,并返回 data URL;
 * renderer 把它写成文档级 CSS 变量,主题壁纸规则以 var() 回落到内置默认图。
 * 设置为 undefined 时移除变量,恢复主题默认壁纸。
 */
export const CONVERSATION_WALLPAPER_CSS_VAR = "--zcode-conversation-wallpaper";

export interface ConversationWallpaperResult {
  dataUrl?: string;
}

export function applyConversationWallpaper(dataUrl: string | undefined): void {
  if (typeof document === "undefined") {
    return;
  }
  if (dataUrl) {
    document.documentElement.style.setProperty(
      CONVERSATION_WALLPAPER_CSS_VAR,
      `url("${dataUrl}")`,
    );
  } else {
    document.documentElement.style.removeProperty(CONVERSATION_WALLPAPER_CSS_VAR);
  }
}

/** 启动时恢复已保存的自定义壁纸;命令不可用(如 Web 环境)时静默保持默认。 */
export async function loadConversationWallpaper(
  platform: IPlatformService,
): Promise<string | undefined> {
  try {
    const result = (await platform.executeDesktopCommand(
      DesktopCommandIds.GetConversationWallpaper,
    )) as ConversationWallpaperResult | undefined;
    const dataUrl = result?.dataUrl;
    applyConversationWallpaper(dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
}
