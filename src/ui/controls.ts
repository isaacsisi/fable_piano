import { el, button } from '../utils/dom';

export interface ControlsCallbacks {
  onVolumeChange: (value: number) => void;
  onOctaveChange: (shift: number) => void;
  onSustainChange: (enabled: boolean) => void;
  onRecord: () => void;
  onStopRecord: () => void;
  onPlay: () => void;
  onClear: () => void;
  onStopAll: () => void;
}

export interface ControlsState {
  isRecording: boolean;
  isPlaying: boolean;
  eventCount: number;
}

const MIN_OCTAVE = -2;
const MAX_OCTAVE = 2;

/**
 * Controls：构建控制面板（音量 / 八度 / 延音 / 录制回放 / Stop All），
 * 并根据录制器状态刷新按钮可用性。
 */
export class Controls {
  readonly element: HTMLElement;
  private octaveShift = 0;
  private octaveLabel: HTMLElement;
  private recordBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private recordInfo: HTMLElement;

  constructor(private callbacks: ControlsCallbacks) {
    this.element = el('div', 'controls');

    // ---- 音量 ----
    const volumeGroup = el('div', 'control-group');
    volumeGroup.appendChild(el('label', 'control-label', 'Volume'));
    const volumeSlider = el('input', 'volume-slider');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = '0.7';
    volumeSlider.addEventListener('input', () => {
      callbacks.onVolumeChange(parseFloat(volumeSlider.value));
    });
    volumeGroup.appendChild(volumeSlider);

    // ---- 八度 ----
    const octaveGroup = el('div', 'control-group');
    const octaveDown = button('Octave −');
    const octaveUp = button('Octave +');
    this.octaveLabel = el('span', 'octave-label', 'Octave: 0');
    octaveDown.addEventListener('click', () => this.shiftOctave(-1));
    octaveUp.addEventListener('click', () => this.shiftOctave(1));
    octaveGroup.append(octaveDown, this.octaveLabel, octaveUp);

    // ---- 延音 ----
    const sustainGroup = el('div', 'control-group');
    const sustainLabel = el('label', 'sustain-toggle');
    const sustainCheckbox = el('input');
    sustainCheckbox.type = 'checkbox';
    sustainCheckbox.addEventListener('change', () => {
      callbacks.onSustainChange(sustainCheckbox.checked);
    });
    sustainLabel.append(sustainCheckbox, document.createTextNode(' Sustain'));
    sustainGroup.appendChild(sustainLabel);

    // ---- 录制 / 回放 ----
    const recordGroup = el('div', 'control-group');
    this.recordBtn = button('● Record', 'btn-record');
    this.stopBtn = button('■ Stop');
    this.playBtn = button('▶ Play');
    this.clearBtn = button('Clear');
    const stopAllBtn = button('Stop All', 'btn-stop-all');
    this.recordInfo = el('span', 'record-info', '未录制');

    this.recordBtn.addEventListener('click', () => callbacks.onRecord());
    this.stopBtn.addEventListener('click', () => callbacks.onStopRecord());
    this.playBtn.addEventListener('click', () => callbacks.onPlay());
    this.clearBtn.addEventListener('click', () => callbacks.onClear());
    stopAllBtn.addEventListener('click', () => callbacks.onStopAll());

    recordGroup.append(this.recordBtn, this.stopBtn, this.playBtn, this.clearBtn, stopAllBtn, this.recordInfo);

    this.element.append(volumeGroup, octaveGroup, sustainGroup, recordGroup);
    this.update({ isRecording: false, isPlaying: false, eventCount: 0 });
  }

  /** 根据录制器状态刷新按钮的禁用状态和文案 */
  update(state: ControlsState): void {
    this.recordBtn.disabled = state.isRecording || state.isPlaying;
    this.stopBtn.disabled = !state.isRecording;
    this.playBtn.disabled = state.isRecording || state.isPlaying || state.eventCount === 0;
    this.clearBtn.disabled = state.isRecording || state.eventCount === 0;
    this.recordBtn.classList.toggle('recording', state.isRecording);

    if (state.isRecording) {
      this.recordInfo.textContent = `录制中… ${state.eventCount} 个事件`;
    } else if (state.isPlaying) {
      this.recordInfo.textContent = '回放中…';
    } else if (state.eventCount > 0) {
      this.recordInfo.textContent = `已录制 ${state.eventCount} 个事件`;
    } else {
      this.recordInfo.textContent = '未录制';
    }
  }

  private shiftOctave(delta: number): void {
    const next = this.octaveShift + delta;
    if (next < MIN_OCTAVE || next > MAX_OCTAVE) return;
    this.octaveShift = next;
    this.octaveLabel.textContent = `Octave: ${next > 0 ? '+' : ''}${next}`;
    this.callbacks.onOctaveChange(next);
  }
}
