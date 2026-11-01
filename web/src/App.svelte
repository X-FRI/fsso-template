<!-- 文件职责：Demo 工作区用 Superforms 与官方 Form 字段提交创建，用 TanStack Query 读取生成 SDK 的列表和详情，并用 TanStack Table 与官方表格组件渲染当前页；删除经确认对话框调用同一 SDK，错误与分页状态留在页面内。 -->
<script lang="ts">
  import { browser } from "$app/environment";
  import { untrack } from "svelte";
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";
  import {
    createTable,
    getCoreRowModel,
    type ColumnDef,
    type TableOptionsResolved,
    type TableState,
  } from "@tanstack/table-core";
  import { superForm, type SuperValidated } from "sveltekit-superforms";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { createDemo, deleteDemo, type DemoResponse } from "$lib/api";
  import { demoDetailOptions, listDemosOptions } from "$lib/api/queries";
  import { extractErrorMessage, pageSummary, totalPages } from "$lib/demo-helpers";
  import { demoFormSchema, type DemoFormValues } from "$lib/demo/schema";
  import * as Alert from "$lib/components/ui/alert";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as Table from "$lib/components/ui/table";
  import { Textarea } from "$lib/components/ui/textarea";

  let { initial }: { initial: SuperValidated<DemoFormValues> } = $props();

  const columns: ColumnDef<DemoResponse>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description" },
    { id: "actions", header: "" },
  ];

  const queryClient = useQueryClient();
  let page = $state(1);
  let pageInput = $state("1");
  let limit = $state(10);
  let selectedId = $state<string | null>(null);
  let submitting = $state(false);
  let deleteTarget = $state<DemoResponse | null>(null);
  let confirmOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state("");

  const listQuery = createQuery(() => listDemosOptions(page, limit));
  const detailQuery = createQuery(() => ({
    ...demoDetailOptions(selectedId ?? ""),
    enabled: browser && selectedId !== null,
  }));

  const items = $derived(listQuery.data?.data ?? []);
  const total = $derived(Number(listQuery.data?.total ?? 0));
  const table = $derived.by(() => {
    const state = {} as TableState;
    const tableRef = createTable({
      data: items,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getRowId: (row) => row.id,
      state,
      onStateChange: () => {},
      renderFallbackValue: null,
    } as TableOptionsResolved<DemoResponse>);
    Object.assign(state, tableRef.initialState);
    return tableRef;
  });

  // onUpdate 返回后，Superforms 会按本次校验结果回写表单。创建请求成功时才让这次回写重置到服务端初值；失败时 cancel，输入和错误都留在当前表单上。
  let resetOnSuccess = false;
  const form = superForm(untrack(() => initial), {
    SPA: true,
    validators: zod4Client(demoFormSchema),
    validationMethod: "onsubmit",
    resetForm: () => resetOnSuccess,
    onUpdate: async ({ form: validated, cancel }) => {
      if (!validated.valid) return;
      resetOnSuccess = false;
      submitting = true;
      try {
        const description = validated.data.description.trim();
        const { data, error } = await createDemo({
          body: {
            name: validated.data.name,
            description: description ? description : null,
          },
        });
        if (error || !data) {
          cancel();
          const message = extractErrorMessage(error);
          validated.valid = false;
          validated.errors = { ...validated.errors, name: [message] };
          errors.set({ ...$errors, name: [message] }, { force: true });
          return;
        }
        resetOnSuccess = true;
        queryClient.setQueryData(demoDetailOptions(data.id).queryKey, data);
        selectedId = data.id;
        page = 1;
        pageInput = "1";
        await queryClient.invalidateQueries({ queryKey: ["listDemos"] });
      } catch (error) {
        cancel();
        const message = extractErrorMessage(error);
        validated.valid = false;
        validated.errors = { ...validated.errors, name: [message] };
        errors.set({ ...$errors, name: [message] }, { force: true });
      } finally {
        submitting = false;
      }
    },
  });
  const { form: formData, enhance, errors } = form;

  async function openDetail(demo: DemoResponse) {
    selectedId = demo.id;
    await queryClient.invalidateQueries({ queryKey: ["demo", demo.id] });
  }

  function askDelete(demo: DemoResponse) {
    deleteTarget = demo;
    deleteError = "";
    confirmOpen = true;
  }

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
      if (selectedId === target.id) selectedId = null;
      deleteTarget = null;
      if (page > 1 && items.length === 1) {
        page -= 1;
        pageInput = String(page);
      }
      await queryClient.invalidateQueries({ queryKey: ["listDemos"] });
    } catch (error) {
      deleteError = extractErrorMessage(error);
    } finally {
      deleting = false;
      confirmOpen = false;
    }
  }

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
    pageInput = "1";
  }

  function cellText(value: unknown): string {
    if (typeof value === "string" && value.trim()) return value;
    return "No description";
  }
</script>

<main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
  <header class="space-y-1">
    <h1 class="text-3xl font-bold tracking-tight">FSSO Stack</h1>
    <p class="text-sm text-muted-foreground">Create, inspect, paginate, and delete demos.</p>
  </header>

  <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
    <div class="space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>Create demo</Card.Title>
          <Card.Description>Name is required; description is optional.</Card.Description>
        </Card.Header>
        <Card.Content>
          <form class="space-y-4" method="POST" use:enhance novalidate>
            <Form.Field {form} name="name">
              <Form.Control>
                {#snippet children({ props })}
                  <Form.Label>Name</Form.Label>
                  <Input {...props} bind:value={$formData.name} placeholder="First demo" />
                {/snippet}
              </Form.Control>
              <Form.FieldErrors>
                {#snippet children({ errors: fieldErrors, errorProps })}
                  {#if fieldErrors.length > 0}
                    <div role="alert">
                      {#each fieldErrors as error, index (index)}
                        <div {...errorProps}>{error}</div>
                      {/each}
                    </div>
                  {/if}
                {/snippet}
              </Form.FieldErrors>
            </Form.Field>
            <Form.Field {form} name="description">
              <Form.Control>
                {#snippet children({ props })}
                  <Form.Label>Description</Form.Label>
                  <Textarea {...props} bind:value={$formData.description} placeholder="Optional details" />
                {/snippet}
              </Form.Control>
              <Form.FieldErrors>
                {#snippet children({ errors: fieldErrors, errorProps })}
                  {#if fieldErrors.length > 0}
                    <div role="alert">
                      {#each fieldErrors as error, index (index)}
                        <div {...errorProps}>{error}</div>
                      {/each}
                    </div>
                  {/if}
                {/snippet}
              </Form.FieldErrors>
            </Form.Field>
            <Button type="submit" disabled={submitting}>
              <PlusIcon />
              {submitting ? "Creating..." : "Create demo"}
            </Button>
          </form>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Detail</Card.Title>
          <Card.Description>Inspect the selected demo.</Card.Description>
        </Card.Header>
        <Card.Content>
          {#if detailQuery.isError}
            <Alert.Root variant="destructive">
              <Alert.Description>{extractErrorMessage(detailQuery.error)}</Alert.Description>
            </Alert.Root>
          {:else if selectedId && detailQuery.isPending}
            <p role="status" class="text-sm text-muted-foreground">Loading detail...</p>
          {:else if detailQuery.data}
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="font-medium text-muted-foreground">Name</dt>
                <dd data-testid="detail-name" class="break-words">{detailQuery.data.name}</dd>
              </div>
              <div>
                <dt class="font-medium text-muted-foreground">Description</dt>
                <dd data-testid="detail-description" class="break-words">
                  {detailQuery.data.description || "No description"}
                </dd>
              </div>
              <div>
                <dt class="font-medium text-muted-foreground">ID</dt>
                <dd class="break-all font-mono text-xs">{detailQuery.data.id}</dd>
              </div>
              <div>
                <dt class="font-medium text-muted-foreground">Created</dt>
                <dd>{detailQuery.data.createdAt}</dd>
              </div>
            </dl>
          {:else}
            <p class="text-sm text-muted-foreground">Select a demo to see its detail.</p>
          {/if}
        </Card.Content>
        {#if detailQuery.data}
          <Card.Footer>
            <Button variant="destructive" onclick={() => askDelete(detailQuery.data!)}>
              Delete demo
            </Button>
          </Card.Footer>
        {/if}
      </Card.Root>
    </div>

    <Card.Root>
      <Card.Header class="gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Card.Title>Demos</Card.Title>
            <Card.Description>Newest first, stable server ordering.</Card.Description>
          </div>
          <Badge variant="secondary">{pageSummary(page, limit, total)}</Badge>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-1">
            <Label for="page-size">Per page</Label>
            <select
              id="page-size"
              class="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
            <Label for="page-number">Page</Label>
            <Input
              id="page-number"
              class="w-24"
              type="number"
              min="1"
              bind:value={pageInput}
              onchange={() => applyPageInput(pageInput)}
              onblur={() => applyPageInput(pageInput)}
            />
          </div>
          <Button
            variant="outline"
            onclick={() => changePage(page - 1)}
            disabled={page <= 1 || listQuery.isFetching}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onclick={() => changePage(page + 1)}
            disabled={page >= totalPages(total, limit) || listQuery.isFetching}
          >
            Next
          </Button>
        </div>
      </Card.Header>
      <Card.Content>
        {#if listQuery.isError}
          <div class="space-y-3 py-8 text-center">
            <Alert.Root variant="destructive">
              <Alert.Description>{extractErrorMessage(listQuery.error)}</Alert.Description>
            </Alert.Root>
            <Button
              variant="outline"
              onclick={() => queryClient.invalidateQueries({ queryKey: ["listDemos"] })}
            >
              Retry
            </Button>
          </div>
        {:else if listQuery.isPending}
          <div class="space-y-3 py-8" role="status">
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <p class="text-center text-sm text-muted-foreground">Loading demos...</p>
          </div>
        {:else if items.length === 0}
          <div class="space-y-1 py-10 text-center" role="status">
            <p class="font-medium">No demos yet</p>
            <p class="text-sm text-muted-foreground">Create the first demo using the form.</p>
          </div>
        {:else}
          <Table.Root aria-label="Demo list">
            <Table.Header>
              {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
                <Table.Row>
                  {#each headerGroup.headers as header (header.id)}
                    <Table.Head>
                      {typeof header.column.columnDef.header === "string"
                        ? header.column.columnDef.header
                        : ""}
                    </Table.Head>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Header>
            <Table.Body>
              {#each table.getRowModel().rows as row (row.id)}
                <Table.Row>
                  {#each row.getVisibleCells() as cell (cell.id)}
                    <Table.Cell>
                      {#if cell.column.id === "name"}
                        <button
                          type="button"
                          class="text-left font-medium hover:underline"
                          onclick={() => openDetail(row.original)}
                        >
                          {row.original.name}
                        </button>
                      {:else if cell.column.id === "actions"}
                        <div class="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onclick={() => openDetail(row.original)}>
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onclick={() => askDelete(row.original)}
                          >
                            Delete
                          </Button>
                        </div>
                      {:else}
                        <span class="text-muted-foreground">{cellText(cell.getValue())}</span>
                      {/if}
                    </Table.Cell>
                  {/each}
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        {/if}
        {#if deleteError}
          <div class="mt-3">
            <Alert.Root variant="destructive">
              <Alert.Description>{deleteError}</Alert.Description>
            </Alert.Root>
          </div>
        {/if}
      </Card.Content>
      <Card.Footer class="justify-between text-sm text-muted-foreground">
        <span>Total: {total}</span>
        <span>Page {page} of {totalPages(total, limit)}</span>
      </Card.Footer>
    </Card.Root>
  </div>
</main>

<AlertDialog.Root bind:open={confirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete demo?</AlertDialog.Title>
      <AlertDialog.Description>
        {deleteTarget
          ? `This permanently deletes "${deleteTarget.name}".`
          : "This action cannot be undone."}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={confirmDelete}>
        {deleting ? "Deleting..." : "Delete"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
