import * as THREE from 'three';
import type { Input } from '../engine/input';
import type { Music } from '../engine/audio';
import { Notebook } from './notebook';
import { NotebookUI } from './notebookUI';
import { DialogueBox } from './dialogue';
import { Settings } from './settingsUI';
import { Interactions, type Interactable, type NpcInteraction } from './interaction';

// Ties together the notebook, the dialogue box, and proximity interaction. Owns
// the small HUD bits (interaction prompt + capture toast) and decides when the
// player should be frozen because a menu/conversation has the screen.
export class Game {
  readonly notebook = new Notebook();

  private readonly notebookUI = new NotebookUI(this.notebook);
  private readonly dialogue = new DialogueBox();
  private readonly settings: Settings;
  private readonly interactions = new Interactions();

  private readonly prompt: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private toastUntil = 0;

  constructor(music: Music | null) {
    this.settings = new Settings(music);
    this.prompt = hud('prompt');
    this.toast = hud('toast');
  }

  // The world hands us its talkable people; each becomes an interactable that
  // opens dialogue and (once) records a notebook entry.
  addNpc(npc: NpcInteraction): void {
    const item: Interactable = {
      position: npc.position,
      // Anomalies use a tight radius (and default tighter than people) so you
      // have to line them up to catch them.
      radius: npc.radius ?? (npc.examine ? 1.0 : 2.4),
      prompt: `${npc.examine ? 'examine' : 'talk to'} ${npc.name}`,
      interact: () => {
        this.dialogue.start(npc.name, npc.lines);
        if (npc.note && this.notebook.add(npc.note)) {
          this.showToast(`${npc.examine ? 'logged' : 'recorded'}: ${npc.note.title}`);
        }
      },
    };
    this.interactions.add(item);
  }

  // True while a menu/conversation owns the screen → freeze the player.
  get busy(): boolean {
    return this.dialogue.open || this.notebookUI.open || this.settings.open;
  }

  update(dt: number, camera: THREE.Camera, input: Input): void {
    if (!this.toast.hidden && performance.now() > this.toastUntil) this.toast.hidden = true;

    // 1) A conversation captures input until it's dismissed.
    if (this.dialogue.open) {
      this.dialogue.update(dt);
      if (input.consumePress('Space') || input.consumePress('Enter')) this.dialogue.advance();
      else if (input.consumePress('Escape')) this.dialogue.close();
      this.prompt.hidden = true;
      return;
    }

    // 2) Esc opens settings, or closes whichever menu is on top.
    if (input.consumePress('Escape')) {
      if (this.notebookUI.open) this.notebookUI.close();
      else if (this.settings.open) this.settings.close();
      else this.settings.show();
    }

    // 3) N toggles the notebook (not while settings is up).
    if (!this.settings.open && input.consumePress('KeyN')) this.notebookUI.toggle();

    if (this.settings.open || this.notebookUI.open) {
      this.prompt.hidden = true;
      return;
    }

    // 4) Free-roam: highlight whoever the player is near + facing.
    this.interactions.update(camera);
    const active = this.interactions.active;
    if (active) {
      this.prompt.hidden = false;
      this.prompt.textContent = `${active.prompt}   [ Space ]`;
      if (input.consumePress('Space')) active.interact();
    } else {
      this.prompt.hidden = true;
    }
  }

  private showToast(msg: string): void {
    this.toast.textContent = msg;
    this.toast.hidden = false;
    this.toastUntil = performance.now() + 2200;
  }
}

function hud(className: string): HTMLDivElement {
  const e = document.createElement('div');
  e.className = className;
  e.hidden = true;
  document.body.appendChild(e);
  return e;
}
