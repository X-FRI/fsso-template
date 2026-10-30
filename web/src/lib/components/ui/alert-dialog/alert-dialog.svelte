<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type Props = {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    class?: string;
    children?: Snippet;
  };

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    class: className,
    children,
  }: Props = $props();
</script>

<AlertDialogPrimitive.Root bind:open>
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay
      class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out"
    />
    <AlertDialogPrimitive.Content
      class={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
        className
      )}
    >
      <div class="flex flex-col space-y-2 text-left">
        <AlertDialogPrimitive.Title class="text-lg font-semibold">
          {title}
        </AlertDialogPrimitive.Title>
        {#if description}
          <AlertDialogPrimitive.Description class="text-sm text-muted-foreground">
            {description}
          </AlertDialogPrimitive.Description>
        {/if}
        {@render children?.()}
      </div>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AlertDialogPrimitive.Cancel
          class="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent sm:mt-0"
        >
          {cancelLabel}
        </AlertDialogPrimitive.Cancel>
        <AlertDialogPrimitive.Action
          onclick={onConfirm}
          class="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
        >
          {confirmLabel}
        </AlertDialogPrimitive.Action>
      </div>
    </AlertDialogPrimitive.Content>
  </AlertDialogPrimitive.Portal>
</AlertDialogPrimitive.Root>
