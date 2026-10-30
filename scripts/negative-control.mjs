// 文件职责：用 runLogged 启动一个执行 process.kill(process.pid,'SIGKILL') 的子进程并断言其被信号终止后返回非零状态，证明信号杀死的子进程不会被误报为 RC=0；不构造违规引用、不运行结构或架构检查、不触碰正式源码与测试基线。
import { resolve } from "node:path";
import { root, runLogged } from "./lib.mjs";

const result = runLogged(
  "negative-control",
  process.execPath,
  ["-e", "process.kill(process.pid, 'SIGKILL')"],
  { logFile: resolve(root, "artifacts/negative-control.log") }
);

console.log(`Negative control: status=${result.status} signal=${result.signal ?? "none"}`);
if (result.status === 0) {
  console.error("Negative control FAILED: signal-killed child was reported as RC=0.");
  process.exit(1);
}

console.log("Negative control OK: signal-killed child is nonzero.");
