// 文件职责：Demo 界面纯逻辑辅助，递归提取服务器或 SDK 错误消息、计算总页数并生成可见区间摘要，同时把带 statusCode 的对象收窄为 ErrorResponse，不依赖 Svelte 运行时。
import type { ErrorResponse } from "$lib/api/generated";

// 依次处理字符串、ErrorResponse.message、嵌套 error 和 detail，全部缺失时才返回通用文案。
export function extractErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (record.error) {
      const nested = extractErrorMessage(record.error);
      if (nested !== "An unexpected error occurred.") return nested;
    }
    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }
  }
  return "An unexpected error occurred.";
}

// 总数或页大小非正时固定一页，避免除零和负数页码。
export function totalPages(total: number, limit: number): number {
  if (!Number.isFinite(total) || total <= 0 || limit <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

// 空列表返回固定空文案，其余计算闭区间起点与终点，终点不超过总数。
export function pageSummary(page: number, limit: number, total: number): string {
  if (total === 0) return "No demos";
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start}-${end} of ${total}`;
}

// 仅以 statusCode 存在作为判别条件，避免把任意对象误判为服务器错误契约。
export function asErrorResponse(value: unknown): ErrorResponse | null {
  if (value && typeof value === "object" && "statusCode" in value) {
    return value as ErrorResponse;
  }
  return null;
}
