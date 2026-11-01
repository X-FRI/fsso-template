// 文件职责：用 Svelte MediaQuery 判断视口是否低于移动断点，供布局按宽度分支；默认断点为七百六十八像素，不读取业务数据。
import { MediaQuery } from "svelte/reactivity";

const DEFAULT_MOBILE_BREAKPOINT = 768;

export class IsMobile extends MediaQuery {
  constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
    super(`max-width: ${breakpoint - 1}px`);
  }
}
