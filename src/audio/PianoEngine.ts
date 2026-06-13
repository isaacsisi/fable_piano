import { noteToFrequency } from './notes';
import { ADSR, PIANO_ENVELOPE, MIN_GAIN, applyAttack, applyRelease } from './envelope';

/**
 * 一个正在发声的"声部"：由多个 oscillator（基频 + 泛音）和一个包络 gain 组成。
 */
interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
  /** sustain 踏板按下时，noteOff 不立即释放，标记为 pending */
  pendingRelease: boolean;
}

/** 泛音配置：[频率倍数, 相对音量, 波形] */
const PARTIALS: Array<[number, number, OscillatorType]> = [
  [1, 1.0, 'triangle'], // 基频，柔和的三角波
  [2, 0.35, 'sine'],    // 二次泛音
  [3, 0.12, 'sine'],    // 三次泛音
];

/**
 * PianoEngine：基于 Web Audio API 的合成钢琴引擎。
 * 信号链：oscillators -> voice gain(包络) -> master gain(音量) -> destination
 */
export class PianoEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private volume = 0.7;
  private sustainEnabled = false;
  private envelope: ADSR = PIANO_ENVELOPE;

  /** 当前正在响的音符列表（按字母序），供 UI 显示 */
  get activeNotes(): string[] {
    return [...this.voices.keys()].sort();
  }

  /** 是否已经初始化过 AudioContext */
  get isStarted(): boolean {
    return this.ctx !== null;
  }

  /**
   * 初始化 / 恢复 AudioContext。
   * 浏览器要求必须在用户交互（pointerdown/keydown）后才能启动音频，
   * 因此该方法应在第一次交互时调用。
   */
  async ensureStarted(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** 按下音符。velocity 0~1，影响该音符的峰值音量。 */
  noteOn(noteName: string, velocity = 0.9): void {
    if (!this.ctx || !this.masterGain) return;

    // 同一音符重复触发时，先快速释放旧声部，避免声音无限叠加
    const existing = this.voices.get(noteName);
    if (existing) {
      this.releaseVoice(noteName, existing);
    }

    const frequency = noteToFrequency(noteName);
    const gain = this.ctx.createGain();
    gain.gain.value = MIN_GAIN;
    gain.connect(this.masterGain);

    const oscillators = PARTIALS.map(([ratio, level, type], i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency * ratio;
      // 轻微 detune 让声音更自然（基频不动，泛音略微偏移）
      if (i > 0) osc.detune.value = i === 1 ? 3 : -4;

      // 每个泛音有独立的音量比例
      const partialGain = this.ctx!.createGain();
      partialGain.gain.value = level;
      osc.connect(partialGain);
      partialGain.connect(gain);
      osc.start();
      return osc;
    });

    // 峰值音量：随频率略微降低高音音量，听感更平衡；除以泛音总能量防止削波
    const peak = (velocity * 0.5) / (1 + Math.log2(frequency / 261.63) * 0.12);
    applyAttack(gain, this.ctx, Math.max(peak, MIN_GAIN), this.envelope);

    this.voices.set(noteName, { oscillators, gain, pendingRelease: false });
  }

  /** 松开音符。若 sustain 开启则挂起，等踏板松开再释放。 */
  noteOff(noteName: string): void {
    const voice = this.voices.get(noteName);
    if (!voice) return;
    if (this.sustainEnabled) {
      voice.pendingRelease = true;
      return;
    }
    this.releaseVoice(noteName, voice);
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.masterGain && this.ctx) {
      // 用短 ramp 调整音量，避免直接跳变产生爆音
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setSustain(enabled: boolean): void {
    this.sustainEnabled = enabled;
    if (!enabled) {
      // 关闭踏板时，释放所有挂起的音符
      for (const [note, voice] of this.voices) {
        if (voice.pendingRelease) {
          this.releaseVoice(note, voice);
        }
      }
    }
  }

  /** 立即平滑停止所有声音 */
  stopAll(): void {
    for (const [note, voice] of this.voices) {
      this.releaseVoice(note, voice);
    }
  }

  /** 对一个声部应用 release 包络，并在衰减结束后停止/断开节点 */
  private releaseVoice(noteName: string, voice: Voice): void {
    if (!this.ctx) return;
    const stopAt = applyRelease(voice.gain, this.ctx, this.envelope);
    for (const osc of voice.oscillators) {
      osc.stop(stopAt);
    }
    // 衰减结束后断开 gain，释放资源
    const gain = voice.gain;
    window.setTimeout(() => gain.disconnect(), (stopAt - this.ctx.currentTime) * 1000 + 100);
    // 只有当 map 里仍是这个 voice 时才删除（可能已被同名新 voice 覆盖）
    if (this.voices.get(noteName) === voice) {
      this.voices.delete(noteName);
    }
  }
}
