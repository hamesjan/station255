// A Pokémon-style dialogue box pinned to the bottom of the screen. Lines type in
// one character at a time; Space (or Enter) reveals the rest of a line, then
// advances to the next, then closes after the last one.
export class DialogueBox {
  open = false;

  private readonly box: HTMLDivElement;
  private readonly nameTag: HTMLDivElement;
  private readonly textEl: HTMLDivElement;
  private readonly cue: HTMLDivElement;

  private lines: string[] = [];
  private index = 0;
  private full = '';
  private shown = 0; // characters revealed so far (float, for smooth typing)
  private typing = false;
  private onDone: (() => void) | null = null;

  private readonly cps = 42; // typing speed, characters per second

  constructor() {
    this.box = el('div', 'dlg');
    this.box.hidden = true;
    this.nameTag = el('div', 'dlg-name');
    this.textEl = el('div', 'dlg-text');
    this.cue = el('div', 'dlg-cue');
    this.cue.textContent = '▼';
    this.box.append(this.nameTag, this.textEl, this.cue);
    document.body.appendChild(this.box);
  }

  start(name: string, lines: string[], onDone?: () => void): void {
    this.lines = lines.slice();
    this.index = 0;
    this.onDone = onDone ?? null;
    this.nameTag.textContent = name;
    this.nameTag.hidden = name.length === 0;
    this.open = true;
    this.box.hidden = false;
    this.setLine();
  }

  // Space/Enter: finish the current line if still typing, else advance or close.
  advance(): void {
    if (!this.open) return;
    if (this.typing) {
      this.shown = this.full.length;
      this.textEl.textContent = this.full;
      this.typing = false;
      return;
    }
    this.index += 1;
    if (this.index >= this.lines.length) this.close();
    else this.setLine();
  }

  update(dt: number): void {
    if (!this.open) return;
    if (this.typing) {
      this.shown = Math.min(this.full.length, this.shown + this.cps * dt);
      this.textEl.textContent = this.full.slice(0, Math.floor(this.shown));
      if (this.shown >= this.full.length) this.typing = false;
      this.cue.style.opacity = '0';
    } else {
      // blink the "continue" arrow while waiting for the player
      this.cue.style.opacity = Math.floor(performance.now() / 350) % 2 ? '1' : '0.15';
    }
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.box.hidden = true;
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }

  private setLine(): void {
    this.full = this.lines[this.index] ?? '';
    this.shown = 0;
    this.typing = true;
    this.textEl.textContent = '';
  }
}

function el(tag: string, className: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  e.className = className;
  return e;
}
