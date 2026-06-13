import { transposeNote } from '../audio/notes';
import { PIANO_KEYS } from './keyMap';
import type { PianoKey } from './types';
import { el } from '../utils/dom';

export interface PianoKeyboardOptions {
  /** 用户按下琴键（鼠标/触摸），note 为已应用 octaveShift 的实际音符 */
  onNoteOn: (note: string) => void;
  /** 用户松开琴键 */
  onNoteOff: (note: string) => void;
}

/**
 * PianoKeyboard：渲染钢琴键盘 DOM，处理鼠标 / 触摸输入，
 * 并提供 setActive() 供外部（电脑键盘、回放）同步高亮。
 */
export class PianoKeyboard {
  readonly element: HTMLElement;
  private octaveShift = 0;
  /** 实际音符名 -> 琴键 DOM */
  private keyElements = new Map<string, HTMLElement>();
  /** 琴键 DOM -> 基础音符名（不随八度变化），用于事件委托 */
  private baseNoteOf = new Map<HTMLElement, string>();
  /** pointerId -> 正在按住的实际音符（支持多点触摸） */
  private pointerNotes = new Map<number, string>();

  constructor(private options: PianoKeyboardOptions) {
    this.element = el('div', 'piano-keyboard');
    this.render();
    this.bindPointerEvents();
  }

  /** 当前八度偏移下，某个基础音符对应的实际音符 */
  actualNote(baseNote: string): string {
    return transposeNote(baseNote, this.octaveShift * 12);
  }

  /** 设置八度偏移并刷新键面标签 */
  setOctaveShift(shift: number): void {
    this.octaveShift = shift;
    this.keyElements.clear();
    for (const [keyEl, baseNote] of this.baseNoteOf) {
      const actual = this.actualNote(baseNote);
      const label = keyEl.querySelector('.key-note');
      if (label) label.textContent = actual;
      keyEl.classList.remove('active');
      this.keyElements.set(actual, keyEl);
    }
  }

  /** 高亮 / 取消高亮某个实际音符对应的琴键（如果它在当前可见范围内） */
  setActive(note: string, active: boolean): void {
    this.keyElements.get(note)?.classList.toggle('active', active);
  }

  /** 取消所有琴键高亮 */
  clearActive(): void {
    for (const keyEl of this.baseNoteOf.keys()) {
      keyEl.classList.remove('active');
    }
  }

  private render(): void {
    const whiteKeys = PIANO_KEYS.filter((k) => k.type === 'white');
    const blackKeys = PIANO_KEYS.filter((k) => k.type === 'black');

    // 白键：flex 横向排列
    for (const key of whiteKeys) {
      this.element.appendChild(this.createKeyElement(key));
    }

    // 黑键：绝对定位在两个白键交界处
    for (const key of blackKeys) {
      const keyEl = this.createKeyElement(key);
      // 黑键 X#n 位于白键 X(n) 的右边界，居中对齐边界线。
      // 键宽由 CSS 变量控制，移动端缩小时黑键位置自动跟随。
      const lowerWhite = key.note.replace('#', '');
      const whiteIndex = whiteKeys.findIndex((w) => w.note === lowerWhite);
      keyEl.style.left = `calc(${whiteIndex + 1} * var(--white-key-width) - var(--black-key-width) / 2)`;
      this.element.appendChild(keyEl);
    }
  }

  private createKeyElement(key: PianoKey): HTMLElement {
    const keyEl = el('div', `piano-key ${key.type}`);
    const noteLabel = el('span', 'key-note', key.note);
    const kbLabel = el('span', 'key-kb', key.keyboardKey);
    keyEl.append(noteLabel, kbLabel);
    this.baseNoteOf.set(keyEl, key.note);
    this.keyElements.set(key.note, keyEl);
    return keyEl;
  }

  private bindPointerEvents(): void {
    // 事件委托：在容器上统一处理，pointer events 同时覆盖鼠标和触摸
    this.element.addEventListener('pointerdown', (e) => {
      const keyEl = this.keyTarget(e);
      if (!keyEl) return;
      e.preventDefault();
      // 释放隐式指针捕获，让手指滑出琴键时能收到 pointerleave/pointerover
      keyEl.releasePointerCapture?.(e.pointerId);
      this.pressByPointer(e.pointerId, keyEl);
    });

    // 按住滑动到其他键时切换音符（glissando）
    this.element.addEventListener('pointerover', (e) => {
      if (!this.pointerNotes.has(e.pointerId)) return;
      const keyEl = this.keyTarget(e);
      if (keyEl) this.pressByPointer(e.pointerId, keyEl);
    });

    const release = (e: PointerEvent) => this.releaseByPointer(e.pointerId);
    this.element.addEventListener('pointerup', release);
    this.element.addEventListener('pointercancel', release);
    this.element.addEventListener('pointerleave', release);
    // 在键盘外松开鼠标时也要停止发声
    window.addEventListener('pointerup', release);
  }

  private keyTarget(e: PointerEvent): HTMLElement | null {
    const target = e.target as HTMLElement;
    return target.closest<HTMLElement>('.piano-key');
  }

  private pressByPointer(pointerId: number, keyEl: HTMLElement): void {
    const baseNote = this.baseNoteOf.get(keyEl);
    if (!baseNote) return;
    const note = this.actualNote(baseNote);
    const previous = this.pointerNotes.get(pointerId);
    if (previous === note) return;
    if (previous) this.options.onNoteOff(previous);
    this.pointerNotes.set(pointerId, note);
    this.options.onNoteOn(note);
  }

  private releaseByPointer(pointerId: number): void {
    const note = this.pointerNotes.get(pointerId);
    if (!note) return;
    this.pointerNotes.delete(pointerId);
    this.options.onNoteOff(note);
  }
}
