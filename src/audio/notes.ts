/**
 * 音符名 <-> MIDI 号 <-> 频率 的转换工具。
 * 约定：C4 = 60，A4 = 69 = 440Hz（十二平均律）。
 */

const SEMITONE_OF: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

const NAME_OF_SEMITONE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 解析音符名，如 "C#4" -> { pitch: "C#", octave: 4 } */
export function parseNoteName(note: string): { pitch: string; octave: number } {
  const match = /^([A-G]#?)(-?\d+)$/.exec(note);
  if (!match) {
    throw new Error(`Invalid note name: ${note}`);
  }
  return { pitch: match[1], octave: parseInt(match[2], 10) };
}

/** 音符名转 MIDI 号，例如 C4 -> 60, A4 -> 69 */
export function noteToMidi(note: string): number {
  const { pitch, octave } = parseNoteName(note);
  return (octave + 1) * 12 + SEMITONE_OF[pitch];
}

/** MIDI 号转音符名，例如 60 -> C4 */
export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NAME_OF_SEMITONE[((midi % 12) + 12) % 12]}${octave}`;
}

/** MIDI 号转频率：440 * 2^((midi - 69) / 12) */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 音符名直接转频率 */
export function noteToFrequency(note: string): number {
  return midiToFrequency(noteToMidi(note));
}

/** 将音符整体移调若干半音，例如 transposeNote("C4", 12) -> "C5" */
export function transposeNote(note: string, semitones: number): string {
  return midiToNote(noteToMidi(note) + semitones);
}

/** 判断音符是否为黑键 */
export function isBlackNote(note: string): boolean {
  return note.includes('#');
}
