// 文件职责：声明 SvelteKit 的 App 命名空间，让页面数据类型和平台类型有明确边界；本模板不在服务端保存数据库会话，因此不扩展 Locals 认证字段。
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
