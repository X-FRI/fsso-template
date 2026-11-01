// 文件职责：在 SvelteKit 服务端 load 中用公开的 superValidate 与 zod4 适配器生成 Demo 创建表单的初始对象，交给首页传给工作区；这里不访问数据库，也不提交创建请求。
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/server";
import { demoFormSchema } from "$lib/demo/schema";

export const load = async () => {
  return {
    form: await superValidate(zod4(demoFormSchema)),
  };
};
