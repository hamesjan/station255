// Keyboard-only input. Tracks held keys and edge-triggered presses. No mouse:
// looking is done with the arrow keys (see Player).
export class Input {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>(); // keys that went down this frame

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code); // ignore auto-repeat
      this.keys.add(e.code);
      // arrows/space would otherwise scroll the page
      if (SWALLOW.has(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  // True once for a key on the frame it was pressed. Consumes the press so only
  // one handler reacts to it.
  consumePress(code: string): boolean {
    return this.pressed.delete(code);
  }

  // Drop any unconsumed presses; call once at the end of each frame.
  endFrame(): void {
    this.pressed.clear();
  }
}

const SWALLOW = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);
