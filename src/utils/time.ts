/** 高精度当前时间（毫秒），用于录制时间戳 */
export function now(): number {
  return performance.now();
}
