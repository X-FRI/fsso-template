// 文件职责：Playwright 串行浏览器旅程，通过可访问标签与 detail-name 等测试标识验证空状态、创建详情删除刷新、校验错误、分页边界、失败恢复和强制 API 错误提示。
import { expect, test } from "@playwright/test";

// 串行执行共享同一后端数据库，前一个用例清理或预置的数据不会与后一个并发交错。
test.describe.serial("demo journey", () => {
  test("empty first use, create, detail, delete, gone after reload", async ({
    page,
  }) => {
    await page.goto("/");
    // detail-name 与 detail-description 是稳定测试标识；删除后刷新仍应保持空状态。
    await expect(page.getByText("No demos yet")).toBeVisible();

    await page.getByLabel("Name").fill("Alpha Demo");
    await page.getByLabel("Description").fill("Created by the browser journey");
    await page.getByRole("button", { name: "Create demo" }).click();

    await expect(page.getByTestId("detail-name")).toHaveText("Alpha Demo");
    await expect(
      page.getByTestId("detail-description")
    ).toHaveText("Created by the browser journey");
    await expect(page.getByRole("table", { name: "Demo list" })).toContainText(
      "Alpha Demo"
    );

    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByTestId("detail-name")).toHaveText("Alpha Demo");

    await page.getByRole("button", { name: "Delete demo" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("No demos yet")).toBeVisible();
    await page.reload();
    await expect(page.getByText("No demos yet")).toBeVisible();
    await expect(page.getByText("Alpha Demo")).toHaveCount(0);
  });

  // 空白名称由 Superforms 客户端校验拦截，页面必须以 alert 角色显示包含 name 的消息。
  test("invalid submit shows server validation", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Name").fill("");
    await page.getByRole("button", { name: "Create demo" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(/name/i);
  });

  test("detail and delete rejections show errors and recover", async ({
    page,
    request,
  }) => {
    const created = await request.post("/api/demos", {
      data: { name: "Abort Recovery Demo" },
    });
    expect(created.status()).toBe(201);

    await page.goto("/");
    await expect(page.getByText("Abort Recovery Demo")).toBeVisible();

    // 用路由中断模拟网络失败，再取消中断验证 UI 能从错误状态恢复并完成删除。
    await page.route("**/api/demos/*", (route) => route.abort());
    await page.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("alert")).toContainText(/failed|error/i);

    await page.unroute("**/api/demos/*");
    await page.getByRole("button", { name: "View" }).click();
    await expect(page.getByTestId("detail-name")).toHaveText(
      "Abort Recovery Demo"
    );

    await page.route("**/api/demos/*", (route) => route.abort());
    await page.getByRole("button", { name: "Delete demo" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(/failed|error/i);

    await page.unroute("**/api/demos/*");
    await page.getByRole("button", { name: "Delete demo" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByText("No demos yet")).toBeVisible();
    await expect(page.getByText("Abort Recovery Demo")).toHaveCount(0);
  });

  // 页码输入越界时组件夹紧到有效页，Next 与 Previous 在边界处禁用。
  test("pagination next and previous over seeded demos", async ({
    page,
    request,
  }) => {
    for (let index = 1; index <= 6; index += 1) {
      const response = await request.post("/api/demos", {
        data: { name: `Seed demo ${index}` },
      });
      expect(response.status()).toBe(201);
    }

    await page.goto("/");
    await expect(page.getByText("Total: 6")).toBeVisible();
    await page.getByLabel("Per page").selectOption("5");
    await expect(page.getByText("Showing 1-5 of 6")).toBeVisible();
    const pageBox = page.getByLabel("Page", { exact: true });
    await expect(pageBox).toHaveValue("1");

    await pageBox.fill("999");
    await pageBox.blur();
    await expect(pageBox).toHaveValue("2");
    await expect(page.getByText("Showing 6-6 of 6")).toBeVisible();

    await pageBox.fill("0");
    await pageBox.blur();
    await expect(pageBox).toHaveValue("1");
    await expect(page.getByText("Showing 1-5 of 6")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Showing 6-6 of 6")).toBeVisible();
    await expect(page.getByLabel("Page", { exact: true })).toHaveValue("2");
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();

    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByText("Showing 1-5 of 6")).toBeVisible();
    await expect(page.getByLabel("Page", { exact: true })).toHaveValue("1");
    await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  // 页面初始列表请求被中断，错误边界必须可见且包含失败或错误提示。
  test("forced API failure shows a visible error state", async ({ page }) => {
    await page.route("**/api/demos*", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(/failed|error/i);
  });
});
