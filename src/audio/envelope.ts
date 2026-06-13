/**
 * ADSR 包络参数与应用工具。
 * 所有 ramp 都从一个极小值（而不是 0）开始/结束，
 * 配合 exponentialRamp 使用可避免爆音（click/pop）。
 */

export interface ADSR {
  /** 起音时间（秒），很短以保证手感 */
  attack: number;
  /** 衰减时间（秒） */
  decay: number;
  /** 延音电平（0~1，相对峰值） */
  sustain: number;
  /** 释音时间（秒） */
  release: number;
}

/** 默认钢琴包络 */
export const PIANO_ENVELOPE: ADSR = {
  attack: 0.01,
  decay: 0.15,
  sustain: 0.25,
  release: 0.6,
};

/** exponentialRamp 不允许 0，使用这个极小值代替 */
export const MIN_GAIN = 0.0001;

/**
 * 在 gain 节点上应用 Attack + Decay 阶段。
 * peak 为该音符的峰值音量。
 */
export function applyAttack(gain: GainNode, ctx: BaseAudioContext, peak: number, env: ADSR): void {
  const now = ctx.currentTime;
  const param = gain.gain;
  param.cancelScheduledValues(now);
  param.setValueAtTime(MIN_GAIN, now);
  // Attack：快速爬升到峰值
  param.exponentialRampToValueAtTime(Math.max(peak, MIN_GAIN), now + env.attack);
  // Decay：衰减到 sustain 电平
  param.exponentialRampToValueAtTime(Math.max(peak * env.sustain, MIN_GAIN), now + env.attack + env.decay);
}

/**
 * 应用 Release 阶段：从当前值平滑衰减到接近 0。
 * 返回声音完全结束的时间点（用于安排 oscillator.stop）。
 */
export function applyRelease(gain: GainNode, ctx: BaseAudioContext, env: ADSR): number {
  const now = ctx.currentTime;
  const param = gain.gain;
  // 固定当前值再 ramp，避免取消调度后跳变产生爆音
  const current = Math.max(param.value, MIN_GAIN);
  param.cancelScheduledValues(now);
  param.setValueAtTime(current, now);
  param.exponentialRampToValueAtTime(MIN_GAIN, now + env.release);
  return now + env.release + 0.05;
}
