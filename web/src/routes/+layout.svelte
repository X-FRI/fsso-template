<!-- 文件职责：SvelteKit 根布局加载 Tailwind 主题、站点图标和 TanStack Query 客户端，并用视口钩子标记移动宽度；查询默认只在浏览器启用，服务端不连接数据库。 -->
<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { browser } from "$app/environment";
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";

  let { children } = $props();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        retry: false,
      },
    },
  });
  const mobile = new IsMobile();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div data-mobile={mobile.current ? "true" : "false"}>
  <QueryClientProvider client={queryClient}>
    {@render children()}
  </QueryClientProvider>
</div>
