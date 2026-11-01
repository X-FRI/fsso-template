<!-- 文件职责：SvelteKit 首页接收服务端 load 的表单初始对象并传给 Demo 工作区，不在路由文件里写第二套表单或列表，保证浏览器入口和组件测试看到同一棵界面。 -->
<script lang="ts">
  import App from "../App.svelte";

  let { data } = $props();
</script>

<App initial={data.form} />
