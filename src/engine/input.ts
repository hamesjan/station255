// Keyboard + pointer-lock mouse input. Mouse deltas accumulate between frames
// and are drained once per update via consumeMouse().
export class Input {
  locked = false;

  private readonly keys = new Set<string>();
  private dx = 0;
  private dy = 0;

  constructor(private readonly el: HTMLElement) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    el.addEventListener('click', () => {
      if (!this.locked) void el.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  consumeMouse(): { dx: number; dy: number } {
    const d = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return d;
  }
}
