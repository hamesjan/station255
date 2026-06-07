import type { Notebook } from './notebook';

// A paper-styled journal overlay. Toggled with N; lists everything recorded and
// how many. Opening releases the pointer (handled by the Game) so it can be read.
export class NotebookUI {
  open = false;

  private readonly panel: HTMLDivElement;
  private readonly list: HTMLDivElement;
  private readonly countEl: HTMLDivElement;

  constructor(private readonly notebook: Notebook) {
    this.panel = div('nb');
    this.panel.hidden = true;

    const sheet = div('nb-sheet');
    const head = div('nb-head');
    head.textContent = 'NOTEBOOK';
    this.countEl = div('nb-count');
    this.list = div('nb-list');
    const foot = div('nb-foot');
    foot.textContent = 'press  N  or  Esc  to close';

    sheet.append(head, this.countEl, this.list, foot);
    this.panel.appendChild(sheet);
    document.body.appendChild(this.panel);
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    this.render();
    this.open = true;
    this.panel.hidden = false;
  }

  close(): void {
    this.open = false;
    this.panel.hidden = true;
  }

  private render(): void {
    const entries = this.notebook.all();
    this.countEl.textContent = entries.length
      ? `${entries.length} recorded`
      : 'nothing recorded yet';

    this.list.replaceChildren();
    if (entries.length === 0) {
      const empty = div('nb-empty');
      empty.textContent =
        'Walk up to people and press Space to talk. Anything worth remembering ends up here.';
      this.list.appendChild(empty);
      return;
    }
    for (const e of entries) {
      const item = div('nb-item');
      const title = div('nb-item-title');
      title.textContent = '• ' + e.title;
      const body = div('nb-item-body');
      body.textContent = e.body;
      const when = div('nb-item-when');
      when.textContent = new Date(e.at).toLocaleString();
      item.append(title, body, when);
      this.list.appendChild(item);
    }
  }
}

function div(className: string): HTMLDivElement {
  const e = document.createElement('div');
  e.className = className;
  return e;
}
