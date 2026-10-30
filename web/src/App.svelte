<!-- 文件职责：Demo 单页主组件，用 Svelte 5 runes 管理列表、分页、表单、详情、删除确认、请求竞态与错误边界，调用生成 SDK 并渲染 shadcn 卡片、输入和对话框，保留 detail-name 等测试标识。 -->
<script lang="ts">
  import {
    createDemo,
    deleteDemo,
    getDemo,
    listDemos,
    type DemoResponse,
  } from "$lib/api";
  import {
    extractErrorMessage,
    pageSummary,
    totalPages,
  } from "$lib/demo-helpers";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { AlertDialog } from "$lib/components/ui/alert-dialog";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";

  let items = $state<DemoResponse[]>([]);
  let total = $state(0);
  let page = $state(1);
  let pageInput = $state("1");
  let limit = $state(10);
  let listStatus = $state<"idle" | "loading" | "error">("idle");
  let listError = $state("");

  let name = $state("");
  let description = $state("");
  let submitting = $state(false);
  let createError = $state("");

  let selected = $state<DemoResponse | null>(null);
  let detailStatus = $state<"idle" | "loading" | "error">("idle");
  let detailError = $state("");

  let deleteTarget = $state<DemoResponse | null>(null);
  let confirmOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state("");

  let reloadToken = $state(0);
  // 请求序号用于丢弃过期响应，避免快速翻页或重复点击时旧结果覆盖新状态。
  let listRequestId = 0;
  let detailRequestId = 0;

  // 列表加载是唯一写入 items/total 的入口，错误写入 listError 并保持加载状态可恢复。
  async function loadDemos() {
    const requestId = ++listRequestId;
    listStatus = "loading";
    listError = "";
    try {
      const { data, error } = await listDemos({ query: { page, limit } });
      if (requestId !== listRequestId) return;
      if (error) {
        listStatus = "error";
        listError = extractErrorMessage(error);
        return;
      }
      items = data?.data ?? [];
      total = Number(data?.total ?? 0);
      listStatus = "idle";
    } catch (error) {
      if (requestId !== listRequestId) return;
      listStatus = "error";
      listError = extractErrorMessage(error);
    }
  }

  // 仅依赖页码、页大小和重载令牌触发重新加载，避免读取列表长度导致的循环。
  $effect(() => {
    page;
    limit;
    reloadToken;
    void loadDemos();
  });

  $effect(() => {
    pageInput = String(page);
  });

  // 创建成功清空表单并回到第一页，同时把新对象放入详情区；失败只更新 createError。
  async function onCreate(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    createError = "";
    try {
      const { data, error } = await createDemo({
        body: {
          name,
          description: description.trim() ? description : null,
        },
      });
      if (error) {
        createError = extractErrorMessage(error);
        return;
      }
      name = "";
      description = "";
      if (data) {
        selected = data;
        detailStatus = "idle";
        detailError = "";
      }
      page = 1;
      reloadToken += 1;
    } catch (error) {
      createError = extractErrorMessage(error);
    } finally {
      submitting = false;
    }
  }

  // 详情请求也带序号，慢响应不能覆盖用户后来选择的另一条记录。
  async function openDetail(demo: DemoResponse) {
    const requestId = ++detailRequestId;
    selected = demo;
    detailStatus = "loading";
    detailError = "";
    try {
      const { data, error } = await getDemo({ path: { id: demo.id } });
      if (requestId !== detailRequestId) return;
      if (error) {
        detailStatus = "error";
        detailError = extractErrorMessage(error);
        return;
      }
      selected = data ?? demo;
      detailStatus = "idle";
    } catch (error) {
      if (requestId !== detailRequestId) return;
      detailStatus = "error";
      detailError = extractErrorMessage(error);
    } finally {
      if (requestId === detailRequestId && detailStatus === "loading") {
        detailStatus = "idle";
      }
    }
  }

  function askDelete(demo: DemoResponse) {
    deleteTarget = demo;
    deleteError = "";
    confirmOpen = true;
  }

  // 删除成功后清理选中项并在删掉当前页最后一行时回退一页，再触发重载。
  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleting = true;
    deleteError = "";
    try {
      const { error } = await deleteDemo({ path: { id: target.id } });
      if (error) {
        deleteError = extractErrorMessage(error);
        return;
      }
      if (selected?.id === target.id) selected = null;
      deleteTarget = null;
      if (page > 1 && items.length === 1) page -= 1;
      reloadToken += 1;
    } catch (error) {
      deleteError = extractErrorMessage(error);
    } finally {
      deleting = false;
      confirmOpen = false;
    }
  }

  // 数值输入夹在 1 与总页数之间并在越界时取边界值；只有非有限或无法解析的输入回落到第一页，随后同步输入框。
  function changePage(next: number) {
    page = Math.min(Math.max(1, next), totalPages(total, limit));
    pageInput = String(page);
  }

  function applyPageInput(value: string) {
    const parsed = Number(value);
    changePage(Number.isFinite(parsed) ? Math.trunc(parsed) : 1);
  }

  function changeLimit(event: Event) {
    limit = Number((event.currentTarget as HTMLSelectElement).value);
    page = 1;
  }
</script>

<main class="mx-auto min-h-screen max-w-6xl space-y-6 p-6">
  <header class="space-y-1">
    <h1 class="text-3xl font-bold tracking-tight">FSSO Stack</h1>
    <p class="text-muted-foreground">
      Create, inspect, paginate, and delete demos backed by the real F# API.
    </p>
  </header>

  <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create demo</CardTitle>
          <CardDescription>Name is required; description is optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form class="space-y-4" onsubmit={onCreate} novalidate>
            <div class="space-y-2">
              <label class="text-sm font-medium" for="demo-name">Name</label>
              <Input
                id="demo-name"
                name="name"
                bind:value={name}
                placeholder="First demo"
                aria-invalid={createError ? "true" : undefined}
                aria-describedby={createError ? "create-error" : undefined}
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium" for="demo-description">Description</label>
              <Textarea
                id="demo-description"
                name="description"
                bind:value={description}
                placeholder="Optional details"
              />
            </div>
            {#if createError}
              <p id="create-error" role="alert" class="text-sm font-medium text-destructive">
                {createError}
              </p>
            {/if}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create demo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail</CardTitle>
          <CardDescription>Inspect the selected demo.</CardDescription>
        </CardHeader>
        <CardContent>
          {#if detailStatus === "loading"}
            <p role="status" class="text-sm text-muted-foreground">Loading detail...</p>
          {:else if detailStatus === "error"}
            <p role="alert" class="text-sm text-destructive">{detailError}</p>
          {:else if selected}
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="font-medium text-muted-foreground">Name</dt>
                <dd data-testid="detail-name" class="break-words">{selected.name}</dd>
              </div>
              <div>
                <dt class="font-medium text-muted-foreground">Description</dt>
                <dd data-testid="detail-description" class="break-words">
                  {selected.description || "No description"}
                </dd>
              </div>
              <div>
                <dt class="font-medium text-muted-foreground">ID</dt>
                <dd class="break-all font-mono text-xs">{selected.id}</dd>
              </div>
              <div>
                <dt class="font-medium text-muted-foreground">Created</dt>
                <dd>{selected.createdAt}</dd>
              </div>
            </dl>
          {:else}
            <p class="text-sm text-muted-foreground">Select a demo to see its detail.</p>
          {/if}
        </CardContent>
        {#if selected}
          <CardFooter>
            <Button variant="destructive" onclick={() => askDelete(selected!)}>
              Delete demo
            </Button>
          </CardFooter>
        {/if}
      </Card>
    </div>

    <Card>
      <CardHeader class="gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Demos</CardTitle>
            <CardDescription>Newest first, stable server ordering.</CardDescription>
          </div>
          <Badge variant="secondary">{pageSummary(page, limit, total)}</Badge>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground" for="page-size">Per page</label>
            <select
              id="page-size"
              class="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={limit}
              onchange={changeLimit}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground" for="page-number">Page</label>
            <Input
              id="page-number"
              class="w-24"
              type="number"
              min="1"
              bind:value={pageInput}
              onchange={() => applyPageInput(pageInput)}
            />
          </div>
          <Button variant="outline" onclick={() => changePage(page - 1)} disabled={page <= 1 || listStatus === "loading"}>
            Previous
          </Button>
          <Button
            variant="outline"
            onclick={() => changePage(page + 1)}
            disabled={page >= totalPages(total, limit) || listStatus === "loading"}
          >
            Next
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {#if listStatus === "loading"}
          <p role="status" class="py-8 text-center text-sm text-muted-foreground">Loading demos...</p>
        {:else if listStatus === "error"}
          <div class="space-y-3 py-8 text-center">
            <p role="alert" class="text-sm text-destructive">{listError}</p>
            <Button variant="outline" onclick={() => (reloadToken += 1)}>Retry</Button>
          </div>
        {:else if items.length === 0}
          <div class="space-y-1 py-10 text-center" role="status">
            <p class="font-medium">No demos yet</p>
            <p class="text-sm text-muted-foreground">Create the first demo using the form.</p>
          </div>
        {:else}
          <ul class="divide-y" aria-label="Demo list">
            {#each items as demo (demo.id)}
              <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <button
                  type="button"
                  class="min-w-0 flex-1 text-left hover:underline"
                  onclick={() => openDetail(demo)}
                >
                  <span class="block truncate font-medium">{demo.name}</span>
                  <span class="block truncate text-sm text-muted-foreground">
                    {demo.description || "No description"}
                  </span>
                </button>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" onclick={() => openDetail(demo)}>View</Button>
                  <Button variant="destructive" size="sm" onclick={() => askDelete(demo)}>Delete</Button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
        {#if deleteError}
          <p role="alert" class="mt-3 text-sm text-destructive">{deleteError}</p>
        {/if}
      </CardContent>
      <CardFooter class="justify-between text-sm text-muted-foreground">
        <span>Total: {total}</span>
        <span>Page {page} of {totalPages(total, limit)}</span>
      </CardFooter>
    </Card>
  </div>
</main>

<AlertDialog
  bind:open={confirmOpen}
  title="Delete demo?"
  description={deleteTarget ? `This permanently deletes "${deleteTarget.name}".` : "This action cannot be undone."}
  confirmLabel={deleting ? "Deleting..." : "Delete"}
  onConfirm={confirmDelete}
/>
