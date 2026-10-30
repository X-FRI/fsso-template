// 文件职责：前端纯函数单元测试，验证服务器错误消息提取与嵌套 SDK 错误解包、未知输入回退、总页数取整和当前可见区间摘要，不渲染组件也不访问网络。
import { describe, expect, it } from "vitest";
import {
  extractErrorMessage,
  pageSummary,
  totalPages,
} from "./demo-helpers";

describe("extractErrorMessage", () => {
  it("reads the server ErrorResponse message", () => {
    expect(
      extractErrorMessage({
        statusCode: 400,
        code: "validation",
        message: "Name is required.",
        traceId: "abc",
      })
    ).toBe("Name is required.");
  });

  // SDK 常把服务器错误包在 error 字段，测试确保递归解包而不是显示对象字符串。
  it("unwraps nested sdk errors", () => {
    expect(extractErrorMessage({ error: { message: "Not found" } })).toBe(
      "Not found"
    );
  });

  it("falls back for unknown errors", () => {
    expect(extractErrorMessage(undefined)).toBe(
      "An unexpected error occurred."
    );
  });
});

// 仅覆盖空总数归为一页与非整除二十一分之十向上取整，未覆盖整除边界。
describe("pagination helpers", () => {
  it("computes pages", () => {
    expect(totalPages(0, 10)).toBe(1);
    expect(totalPages(21, 10)).toBe(3);
  });

  it("summarizes the visible slice", () => {
    expect(pageSummary(2, 10, 21)).toBe("Showing 11-20 of 21");
  });
});
