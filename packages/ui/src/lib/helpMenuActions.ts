import { DesktopCommandIds, type IPlatformService } from "@zcode/shared";
import type { IntlInstance } from "@/i18n/IntlProvider.js";
import type { FeedbackSubmitDraft } from "@/feedback/feedbackStore.js";
import { runExportLogsAction } from "@/lib/exportLogsAction.js";
import { ZCODE_PRODUCT_DOCS_URL } from "@/lib/productDocs.js";

interface HelpMenuActionHandlers {
  openIssueReport: () => Promise<void>;
  openProductDocs: () => void;
  exportLogs: () => void;
}

export function createHelpMenuActionHandlers({
  platform,
  intl,
  openSubmit,
  isDesktop = false,
}: {
  platform: Pick<
    IPlatformService,
    "captureWindowScreenshot" | "exportLogs" | "openExternal" | "executeDesktopCommand"
  >;
  intl: IntlInstance;
  openSubmit: (draft?: FeedbackSubmitDraft) => void;
  /** 是否桌面端。桌面端走主进程 Issue 入口,其它宿主保持内置反馈表单。 */
  isDesktop?: boolean;
}): HelpMenuActionHandlers {
  return {
    // 桌面端优先走主进程的 Issue 入口(本地 config/default.json 配置了 issues_url
    // 时打开上游仓库的 GitHub Issue 页,未配置回落到内置反馈表单)。
    openIssueReport: async () => {
      if (isDesktop) {
        await platform.executeDesktopCommand(DesktopCommandIds.OpenIssueTracker);
        return;
      }
      openSubmit({
        type: "bug",
        module: "其它",
        severity: "P2-中",
        includeLogs: false,
        screenshots: [],
      });
    },
    openProductDocs: () => {
      platform.openExternal(ZCODE_PRODUCT_DOCS_URL);
    },
    exportLogs: () => {
      void runExportLogsAction(platform, intl);
    },
  };
}
