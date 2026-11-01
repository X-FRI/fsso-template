// 文件职责：把生成的 SDK 操作包成 TanStack Query 选项，查询键与请求参数一一对应；这里只描述 HTTP 查询，不打开数据库，也不改写 OpenAPI 生成文件。
import { keepPreviousData, queryOptions } from "@tanstack/svelte-query";
import { getDemo, listDemos } from "./generated/sdk.gen";

export function listDemosOptions(page: number, limit: number) {
  return queryOptions({
    queryKey: ["listDemos", { page, limit }],
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { data, error } = await listDemos({ query: { page, limit }, signal });
      if (error) throw error;
      if (!data) throw new Error("List response was empty.");
      return data;
    },
  });
}

export function demoDetailOptions(id: string) {
  return queryOptions({
    queryKey: ["demo", id],
    queryFn: async ({ signal }) => {
      const { data, error } = await getDemo({ path: { id }, signal });
      if (error) throw error;
      if (!data) throw new Error("Detail response was empty.");
      return data;
    },
  });
}
