import { noteToFrequency, isBlackNote } from '../audio/notes';
import type { PianoKey } from './types';

/**
 * 电脑键盘 -> 基础音符 的映射。
 * 使用 KeyboardEvent.code（物理键位），避免输入法 / 大小写 / Shift 的干扰。
 */
export const CODE_TO_NOTE: Record<string, string> = {
  // 白键
  KeyA: 'C4',
  KeyS: 'D4',
  KeyD: 'E4',
  KeyF: 'F4',
  KeyG: 'G4',
  KeyH: 'A4',
  KeyJ: 'B4',
  KeyK: 'C5',
  KeyL: 'D5',
  Semicolon: 'E5',
  Quote: 'F5',
  // 黑键
  KeyW: 'C#4',
  KeyE: 'D#4',
  KeyT: 'F#4',
  KeyY: 'G#4',
  KeyU: 'A#4',
  KeyO: 'C#5',
  KeyP: 'D#5',
  BracketRight: 'F#5',
};

/** code -> 显示标签 */
const CODE_LABEL: Record<string, string> = {
  Semicolon: ';',
  Quote: "'",
  BracketRight: ']',
};

function labelOfCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  return CODE_LABEL[code] ?? code;
}

/** note -> 键盘标签（反查映射） */
const NOTE_TO_LABEL = new Map<string, string>(
  Object.entries(CODE_TO_NOTE).map(([code, note]) => [note, labelOfCode(code)])
);

/** 基础音域：C4 ~ B5，共 24 个音（14 白键 + 10 黑键） */
const BASE_NOTES = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
];

/** 按音高顺序排列的全部琴键定义 */
export const PIANO_KEYS: PianoKey[] = BASE_NOTES.map((note) => ({
  note,
  type: isBlackNote(note) ? 'black' : 'white',
  keyboardKey: NOTE_TO_LABEL.get(note) ?? '',
  frequency: noteToFrequency(note),
}));
