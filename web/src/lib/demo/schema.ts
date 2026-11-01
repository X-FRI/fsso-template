// 文件职责：定义 Demo 创建表单的 Zod 约束，名称去空白后至少一字且不超过一百字，描述不超过五百字；空字符串表示未填写，不预置示例名称，校验文案与领域错误一致。
import { z } from "zod";

export const demoFormSchema = z.object({
  name: z.string().trim()
    .min(1, "Name is required.")
    .max(100, "Name must be at most 100 characters."),
  description: z.string().trim().max(500, "Description must be at most 500 characters."),
});

export type DemoFormValues = z.infer<typeof demoFormSchema>;
