import type { RecordedEvent } from '../piano/types';
import { now } from '../utils/time';

export interface RecorderCallbacks {
  /** 回放时触发音符（含高亮），与现场弹奏走同一条路径 */
  onPlayEvent: (event: RecordedEvent) => void;
  /** 录制/回放状态变化时通知 UI 刷新 */
  onStateChange: () => void;
}

/**
 * Recorder：录制 noteOn/noteOff 事件流，并按相对时间回放。
 * 回放使用 setTimeout 调度；事件粒度较粗（人手弹奏），精度足够。
 */
export class Recorder {
  private events: RecordedEvent[] = [];
  private startTime = 0;
  private _isRecording = false;
  private _isPlaying = false;
  private playbackTimers: number[] = [];

  constructor(private callbacks: RecorderCallbacks) {}

  get isRecording(): boolean {
    return this._isRecording;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get eventCount(): number {
    return this.events.length;
  }

  /** 开始录制（清空上一段内容） */
  startRecording(): void {
    if (this._isPlaying) return;
    this.events = [];
    this.startTime = now();
    this._isRecording = true;
    this.callbacks.onStateChange();
  }

  stopRecording(): void {
    if (!this._isRecording) return;
    this._isRecording = false;
    this.callbacks.onStateChange();
  }

  /** 由 main.ts 在每次 noteOn/noteOff 时调用 */
  capture(type: RecordedEvent['type'], note: string): void {
    if (!this._isRecording) return;
    this.events.push({ type, note, time: now() - this.startTime });
  }

  /** 按时间顺序回放全部事件 */
  play(): void {
    if (this._isPlaying || this._isRecording || this.events.length === 0) return;
    this._isPlaying = true;
    this.callbacks.onStateChange();

    for (const event of this.events) {
      const timer = window.setTimeout(() => {
        this.callbacks.onPlayEvent(event);
      }, event.time);
      this.playbackTimers.push(timer);
    }

    // 最后一个事件之后结束回放状态
    const last = this.events[this.events.length - 1];
    const endTimer = window.setTimeout(() => {
      this._isPlaying = false;
      this.playbackTimers = [];
      this.callbacks.onStateChange();
    }, last.time + 50);
    this.playbackTimers.push(endTimer);
  }

  /** 停止回放（Stop All 时调用），不清空已录内容 */
  stopPlayback(): void {
    if (!this._isPlaying) return;
    for (const timer of this.playbackTimers) {
      window.clearTimeout(timer);
    }
    this.playbackTimers = [];
    this._isPlaying = false;
    this.callbacks.onStateChange();
  }

  /** 清空录制内容 */
  clear(): void {
    this.stopPlayback();
    this.events = [];
    this.callbacks.onStateChange();
  }
}
