// 文件职责：提供 SvelteKit 通用 reroute 钩子，按请求路径原样返回，不改写路由，也不在这里访问 API 或数据库，服务端代理放在另一个钩子文件。
export const reroute = (request: { url: URL }) => request.url.pathname;
