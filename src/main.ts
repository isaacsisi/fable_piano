import './styles.css';
import { PianoEngine } from './audio/PianoEngine';
import { PianoKeyboard } from './piano/PianoKeyboard';
import { CODE_TO_NOTE } from './piano/keyMap';
import { Recorder } from './recorder/Recorder';
import { Controls } from './ui/controls';
import { el } from './utils/dom';
import type { RecordedEvent } from './piano/types';

const app = document.getElementById('app')!;

// ---------------------------------------------------------------------------
// 音频引擎
// ---------------------------------------------------------------------------
const engine = new PianoEngine();

/** 第一次用户交互时启动 AudioContext（浏览器自动播放限制） */
async function ensureAudio(): Promise<void> {
  const wasStarted = engine.isStarted;
  await engine.ensureStarted();
  if (!wasStarted) {
    audioHint.classList.add('hidden');
  }
}

// ---------------------------------------------------------------------------
// 统一的发声入口：现场弹奏和回放都走这里，保证录制 / 高亮 / 显示一致
// ---------------------------------------------------------------------------
function noteOn(note: string, options: { record?: boolean } = { record: true }): void {
  engine.noteOn(note);
  keyboard.setActive(note, true);
  if (options.record) recorder.capture('noteOn', note);
  updateNowPlaying();
  if (recorder.isRecording) syncControls();
}

function noteOff(note: string, options: { record?: boolean } = { record: true }): void {
  engine.noteOff(note);
  keyboard.setActive(note, false);
  if (options.record) recorder.capture('noteOff', note);
  updateNowPlaying();
  if (recorder.isRecording) syncControls();
}

// ---------------------------------------------------------------------------
// 钢琴键盘（鼠标 / 触摸）
// ---------------------------------------------------------------------------
const keyboard = new PianoKeyboard({
  onNoteOn: (note) => {
    void ensureAudio().then(() => {
      // ensureAudio 是异步的，但 noteOn 必须在 context 就绪后调用
      noteOn(note);
    });
  },
  onNoteOff: (note) => noteOff(note),
});

// ---------------------------------------------------------------------------
// 录制 / 回放
// ---------------------------------------------------------------------------
const recorder = new Recorder({
  onPlayEvent: (event: RecordedEvent) => {
    // 回放事件不再写入录制，避免自我嵌套
    if (event.type === 'noteOn') noteOn(event.note, { record: false });
    else noteOff(event.note, { record: false });
  },
  onStateChange: () => syncControls(),
});

// ---------------------------------------------------------------------------
// 控制面板
// ---------------------------------------------------------------------------
const controls = new Controls({
  onVolumeChange: (value) => engine.setVolume(value),
  onOctaveChange: (shift) => {
    // 切换八度前先停掉所有声音，避免残留的 noteOff 找不到对应音符
    engine.stopAll();
    keyboard.clearActive();
    activeCodes.clear();
    keyboard.setOctaveShift(shift);
    updateNowPlaying();
  },
  onSustainChange: (enabled) => engine.setSustain(enabled),
  onRecord: () => {
    void ensureAudio();
    recorder.startRecording();
  },
  onStopRecord: () => recorder.stopRecording(),
  onPlay: () => {
    void ensureAudio().then(() => recorder.play());
  },
  onClear: () => recorder.clear(),
  onStopAll: () => {
    recorder.stopPlayback();
    engine.stopAll();
    keyboard.clearActive();
    activeCodes.clear();
    updateNowPlaying();
  },
});

function syncControls(): void {
  controls.update({
    isRecording: recorder.isRecording,
    isPlaying: recorder.isPlaying,
    eventCount: recorder.eventCount,
  });
}

// ---------------------------------------------------------------------------
// 电脑键盘输入
// ---------------------------------------------------------------------------
/** 正在按住的物理按键 code -> 实际音符。用于防止长按自动重复触发，并保证 keyup 释放正确的音符 */
const activeCodes = new Map<string, string>();

window.addEventListener('keydown', (e) => {
  // 忽略输入控件中的按键和系统快捷键
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') target.blur();

  const baseNote = CODE_TO_NOTE[e.code];
  if (!baseNote || activeCodes.has(e.code)) return;
  e.preventDefault();

  const note = keyboard.actualNote(baseNote);
  activeCodes.set(e.code, note);
  void ensureAudio().then(() => noteOn(note));
});

window.addEventListener('keyup', (e) => {
  const note = activeCodes.get(e.code);
  if (!note) return;
  activeCodes.delete(e.code);
  noteOff(note);
});

// 窗口失焦时释放所有按键，避免音符卡住
window.addEventListener('blur', () => {
  for (const note of activeCodes.values()) {
    noteOff(note);
  }
  activeCodes.clear();
});

// ---------------------------------------------------------------------------
// 正在播放的音符显示
// ---------------------------------------------------------------------------
const nowPlaying = el('div', 'now-playing');
const nowPlayingLabel = el('span', 'now-playing-label', 'Now Playing:');
const nowPlayingNotes = el('span', 'now-playing-notes', '—');
nowPlaying.append(nowPlayingLabel, nowPlayingNotes);

function updateNowPlaying(): void {
  const notes = engine.activeNotes;
  nowPlayingNotes.textContent = notes.length > 0 ? notes.join('  ') : '—';
  nowPlaying.classList.toggle('has-notes', notes.length > 0);
}

// ---------------------------------------------------------------------------
// 页面结构
// ---------------------------------------------------------------------------
const title = el('h1', 'title', 'Web Piano · Play with Keyboard');
const audioHint = el('div', 'audio-hint', '点击任意琴键开始音频');

const card = el('div', 'piano-card');
const keyboardScroll = el('div', 'keyboard-scroll');
keyboardScroll.appendChild(keyboard.element);
card.append(audioHint, nowPlaying, keyboardScroll, controls.element);

const mapping = el('div', 'mapping-hint');
mapping.append(
  el('div', '', "A S D F G H J K L ; ' = C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5"),
  el('div', '', 'W E T Y U  /  O P ] = 黑键 C#4 D#4 F#4 G#4 A#4  /  C#5 D#5 F#5')
);

const glow1 = el('div', 'glow glow-1');
const glow2 = el('div', 'glow glow-2');

app.append(glow1, glow2, title, card, mapping);
