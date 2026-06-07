// Looping background music. Browsers block audio until a user gesture, so
// start() must be called from a click/keypress — we wire it to the first
// pointer-down. After that it loops constantly.
export class Music {
  private readonly el: HTMLAudioElement;
  private started = false;

  constructor(url: string, volume = 0.5) {
    this.el = new Audio(url);
    this.el.loop = true;
    this.el.volume = volume;
    this.el.preload = 'auto';
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.el.play().catch(() => {
      this.started = false; // gesture not accepted yet; allow a later retry
    });
  }

  // Mute (keep playing, silenced) rather than pause, so position is preserved.
  toggle(): void {
    this.el.muted = !this.el.muted;
  }

  get volume(): number {
    return this.el.volume;
  }

  setVolume(v: number): void {
    this.el.volume = Math.max(0, Math.min(1, v));
  }

  get muted(): boolean {
    return this.el.muted;
  }

  setMuted(m: boolean): void {
    this.el.muted = m;
  }
}
