import type { Music } from '../engine/audio';

// Esc-triggered settings modal. Dims the world behind it and (for now) holds
// sound controls. The mouse is usable while it's open, so the slider/checkbox
// can be dragged/clicked.
export class Settings {
  open = false;

  private readonly panel: HTMLDivElement;
  private readonly slider: HTMLInputElement;
  private readonly volVal: HTMLDivElement;
  private readonly muteBox: HTMLInputElement;

  constructor(private readonly music: Music | null) {
    this.panel = div('settings');
    this.panel.hidden = true;

    const sheet = div('set-sheet');
    const head = div('set-head');
    head.textContent = 'SETTINGS';

    const section = div('set-section-title');
    section.textContent = 'Sound';

    // volume row
    const volRow = div('set-row');
    const volLabel = document.createElement('label');
    volLabel.textContent = 'Volume';
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = '100';
    this.slider.step = '1';
    this.volVal = div('val');
    volRow.append(volLabel, this.slider, this.volVal);

    // mute row
    const muteRow = div('set-row');
    const muteLabel = document.createElement('label');
    muteLabel.textContent = 'Mute';
    this.muteBox = document.createElement('input');
    this.muteBox.type = 'checkbox';
    muteRow.append(muteLabel, this.muteBox);

    const foot = div('set-foot');
    foot.textContent = 'press  Esc  to close';

    sheet.append(head, section, volRow, muteRow, foot);
    this.panel.appendChild(sheet);
    document.body.appendChild(this.panel);

    if (!this.music) {
      this.slider.disabled = true;
      this.muteBox.disabled = true;
      section.textContent = 'Sound — no track loaded';
    }

    this.slider.addEventListener('input', () => {
      const v = Number(this.slider.value) / 100;
      this.music?.setVolume(v);
      this.volVal.textContent = `${this.slider.value}%`;
      if (v > 0 && this.music?.muted) {
        this.music.setMuted(false); // raising volume un-mutes
        this.muteBox.checked = false;
      }
    });
    this.muteBox.addEventListener('change', () => {
      this.music?.setMuted(this.muteBox.checked);
    });
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    this.sync();
    this.open = true;
    this.panel.hidden = false;
  }

  close(): void {
    this.open = false;
    this.panel.hidden = true;
  }

  // Reflect the live audio state whenever the modal opens (M may have changed it).
  private sync(): void {
    const vol = this.music ? this.music.volume : 0.5;
    this.slider.value = String(Math.round(vol * 100));
    this.volVal.textContent = `${this.slider.value}%`;
    this.muteBox.checked = this.music ? this.music.muted : false;
  }
}

function div(className: string): HTMLDivElement {
  const e = document.createElement('div');
  e.className = className;
  return e;
}
