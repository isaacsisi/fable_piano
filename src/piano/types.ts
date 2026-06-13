/** 一个钢琴键的静态描述（基础八度下，不含 octaveShift） */
export interface PianoKey {
  /** 基础音符名，如 "C4"、"C#4" */
  note: string;
  type: 'white' | 'black';
  /** 对应的电脑键盘按键显示标签，如 "A"；没有映射则为空字符串 */
  keyboardKey: string;
  /** 基础频率（Hz） */
  frequency: number;
}

/** 录制的单个事件 */
export interface RecordedEvent {
  type: 'noteOn' | 'noteOff';
  note: string;
  /** 相对录制开始的毫秒数 */
  time: number;
}
