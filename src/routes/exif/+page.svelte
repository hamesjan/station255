<script lang="ts">
  import { track } from '$lib/analytics';

  type Entry = { label: string; value: string; sensitive?: boolean };

  let imgUrl = $state<string | null>(null);
  let file = $state<File | null>(null);
  let dropActive = $state(false);
  let entries = $state<Entry[]>([]);
  let parsed = $state(false);
  let otherCount = $state(0);
  let cleanInfo = $state<{ url: string; size: number; name: string } | null>(null);
  let busy = $state(false);

  const TAG_NAMES: Record<number, string> = {
    0x010f: 'Camera make',
    0x0110: 'Camera model',
    0x0112: 'Orientation',
    0x0131: 'Software',
    0x0132: 'Modified date',
    0x013b: 'Artist',
    0x8298: 'Copyright',
    0x829a: 'Exposure time',
    0x829d: 'F-number',
    0x8827: 'ISO',
    0x9003: 'Taken date',
    0x920a: 'Focal length',
    0xa002: 'Width (EXIF)',
    0xa003: 'Height (EXIF)',
    0xa430: 'Owner name',
    0xa431: 'Body serial number',
    0xa434: 'Lens model',
  };

  function parseExif(buf: ArrayBuffer): { entries: Entry[]; other: number } | null {
    const view = new DataView(buf);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

    // Walk JPEG segments looking for APP1/Exif.
    let off = 2;
    let tiff = -1;
    while (off + 4 <= view.byteLength) {
      if (view.getUint8(off) !== 0xff) break;
      const marker = view.getUint8(off + 1);
      if (marker === 0xda) break; // start of scan — no more metadata
      const len = view.getUint16(off + 2);
      if (marker === 0xe1 && len >= 8 && view.getUint32(off + 4) === 0x45786966) {
        tiff = off + 10; // past "Exif\0\0"
        break;
      }
      off += 2 + len;
    }
    if (tiff < 0) return null;

    const little = view.getUint16(tiff) === 0x4949;
    const u16 = (o: number) => view.getUint16(tiff + o, little);
    const u32 = (o: number) => view.getUint32(tiff + o, little);
    if (u16(2) !== 42) return null;

    const found: { tag: number; value: string }[] = [];
    const gps: Record<number, number[] | string> = {};
    let other = 0;

    const rational = (o: number) => {
      const n = u32(o);
      const d = u32(o + 4) || 1;
      return n / d;
    };

    function readValue(type: number, count: number, valOff: number): string | number[] | null {
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 0;
      if (size === 0) return null;
      const total = size * count;
      const o = total <= 4 ? valOff : u32(valOff);
      if (type === 2) {
        let s = '';
        for (let i = 0; i < count - 1; i++) {
          const ch = view.getUint8(tiff + o + i);
          if (ch === 0) break;
          s += String.fromCharCode(ch);
        }
        return s.trim();
      }
      const nums: number[] = [];
      for (let i = 0; i < Math.min(count, 8); i++) {
        if (type === 3) nums.push(u16(o + i * 2));
        else if (type === 4 || type === 9) nums.push(u32(o + i * 4));
        else if (type === 5 || type === 10) nums.push(rational(o + i * 8));
        else nums.push(view.getUint8(tiff + o + i));
      }
      return nums;
    }

    function parseIfd(ifdOff: number, isGps: boolean) {
      if (ifdOff + 2 > view.byteLength - tiff) return;
      const count = u16(ifdOff);
      for (let i = 0; i < count; i++) {
        const e = ifdOff + 2 + i * 12;
        if (e + 12 > view.byteLength - tiff) return;
        const tag = u16(e);
        const type = u16(e + 2);
        const n = u32(e + 4);
        if (!isGps && tag === 0x8769) {
          parseIfd(u32(e + 8), false);
          continue;
        }
        if (!isGps && tag === 0x8825) {
          parseIfd(u32(e + 8), true);
          continue;
        }
        const val = readValue(type, n, e + 8);
        if (val === null) continue;
        if (isGps) {
          gps[tag] = val;
          continue;
        }
        const name = TAG_NAMES[tag];
        if (!name) {
          other++;
          continue;
        }
        let text: string;
        if (typeof val === 'string') text = val;
        else if (tag === 0x829a) text = val[0] >= 1 ? `${val[0]}s` : `1/${Math.round(1 / val[0])}s`;
        else if (tag === 0x829d) text = `f/${val[0].toFixed(1)}`;
        else if (tag === 0x920a) text = `${val[0].toFixed(0)}mm`;
        else text = val.map((v) => (Number.isInteger(v) ? v : v.toFixed(2))).join(', ');
        if (text) found.push({ tag, value: text });
      }
    }

    parseIfd(u32(4), false);

    const result: Entry[] = found.map((f) => ({ label: TAG_NAMES[f.tag], value: f.value }));

    const lat = gps[0x0002];
    const lon = gps[0x0004];
    if (Array.isArray(lat) && Array.isArray(lon) && lat.length >= 3 && lon.length >= 3) {
      const dec = (dms: number[], ref: string, neg: string) =>
        (dms[0] + dms[1] / 60 + dms[2] / 3600) * (ref === neg ? -1 : 1);
      const latRef = typeof gps[0x0001] === 'string' ? (gps[0x0001] as string) : 'N';
      const lonRef = typeof gps[0x0003] === 'string' ? (gps[0x0003] as string) : 'E';
      const la = dec(lat, latRef, 'S').toFixed(5);
      const lo = dec(lon, lonRef, 'W').toFixed(5);
      result.push({ label: 'GPS location', value: `${la}, ${lo}`, sensitive: true });
    }

    return { entries: result, other };
  }

  async function loadFile(f: File) {
    if (!f.type.startsWith('image/')) return;
    file = f;
    cleanInfo = null;
    parsed = false;
    const reader = new FileReader();
    reader.onload = (e) => {
      imgUrl = e.target!.result as string;
    };
    reader.readAsDataURL(f);

    const buf = await f.arrayBuffer();
    const res = parseExif(buf);
    entries = res?.entries ?? [];
    otherCount = res?.other ?? 0;
    parsed = true;
    track('tool_use', { tool: 'exif', tags: entries.length, gps: entries.some((e) => e.sensitive) });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dropActive = false;
    const f = e.dataTransfer?.files[0];
    if (f) loadFile(f);
  }
  function onFileInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }

  async function makeClean() {
    if (!imgUrl || !file) return;
    busy = true;
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = imgUrl!;
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      const isPng = file.type === 'image/png';
      const blob = await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej()), isPng ? 'image/png' : 'image/jpeg', 0.92)
      );
      const base = file.name.replace(/\.[^.]+$/, '');
      cleanInfo = {
        url: URL.createObjectURL(blob),
        size: blob.size,
        name: `${base}_clean.${isPng ? 'png' : 'jpg'}`,
      };
    } finally {
      busy = false;
    }
  }

  function downloadClean() {
    if (!cleanInfo) return;
    const a = document.createElement('a');
    a.href = cleanInfo.url;
    a.download = cleanInfo.name;
    a.click();
    track('export', { tool: 'exif', type: 'clean' });
  }

  function fmtSize(n: number): string {
    return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
  }
</script>

<svelte:head>
  <title>EXIF Viewer & Remover — Check and Strip Photo Metadata Online | Station255</title>
  <meta
    name="description"
    content="View the EXIF metadata hiding in your photos — camera, dates, GPS location — and strip it out with one click. 100% in your browser: the photo never leaves your device."
  />
</svelte:head>

<div class="tool-header">
  <h1 class="tool-title">EXIF VIEWER</h1>
  <p class="tool-sub">See what a photo secretly says about you — then download a clean copy with the metadata gone.</p>
</div>

<div class="workspace">
  {#if !imgUrl}
    <label
      class="drop-zone"
      class:active={dropActive}
      ondragover={(e) => { e.preventDefault(); dropActive = true; }}
      ondragleave={() => { dropActive = false; }}
      ondrop={onDrop}
    >
      <span class="drop-main">Drop a photo here</span>
      <span class="drop-sub">or click to browse · JPEG has the most metadata · nothing is uploaded</span>
      <input type="file" accept="image/*" onchange={onFileInput} class="file-input" />
    </label>
  {:else}
    <div class="report">
      <div class="report-img">
        <img src={imgUrl} alt="Uploaded" />
        {#if file}<span class="img-meta">{file.name} · {fmtSize(file.size)}</span>{/if}
      </div>
      <div class="report-data panel">
        {#if !parsed}
          <p class="hint">Reading…</p>
        {:else if entries.length === 0}
          <p class="clean-msg">No EXIF metadata found.</p>
          <p class="hint">
            PNGs, screenshots, and images already processed by social media usually carry no EXIF.
            {#if otherCount > 0}({otherCount} unrecognized technical tags present.){/if}
          </p>
        {:else}
          <table class="exif-table">
            <tbody>
              {#each entries as e}
                <tr class:sensitive={e.sensitive}>
                  <td class="k">{e.label}</td>
                  <td class="v">{e.value}{#if e.sensitive}<span class="warn"> ⚠ exact location</span>{/if}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if otherCount > 0}
            <p class="hint">+ {otherCount} more technical tags</p>
          {/if}
        {/if}

        <div class="clean-actions">
          {#if !cleanInfo}
            <button class="btn" onclick={makeClean} disabled={busy}>{busy ? 'scrubbing…' : '⌫ Strip all metadata'}</button>
          {:else}
            <button class="btn" onclick={downloadClean}>↓ Download clean copy ({fmtSize(cleanInfo.size)})</button>
          {/if}
          <button class="btn secondary" onclick={() => { imgUrl = null; file = null; }}>← New photo</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<section class="seo panel">
  <h2>About EXIF metadata</h2>
  <p>
    Every photo from a phone or camera carries hidden <strong>EXIF metadata</strong>: the exact
    camera and lens, the moment it was taken, editing software — and often the precise
    <strong>GPS coordinates</strong> of where you were standing. Share the file and you share all
    of that too.
  </p>
  <h3>Is this safe to use on private photos?</h3>
  <p>
    Yes — this page reads and scrubs the file entirely in your browser. Nothing is uploaded to
    any server, ever.
  </p>
  <h3>How does the remover work?</h3>
  <p>
    The clean copy is re-rendered from the raw pixels, so <strong>every</strong> metadata block is
    dropped — EXIF, GPS, thumbnails, serial numbers, all of it. JPEGs are re-encoded at high
    quality (the pixels are visually identical); PNGs stay lossless.
  </p>
  <h3>Do social networks strip EXIF for me?</h3>
  <p>
    Most big platforms strip it on upload, but messengers, email, cloud drives, and forums often
    don't. If you're posting a photo anywhere you don't fully control, scrub it first.
  </p>
  <div class="see-also">
    <span class="see-label">Related:</span>
    <a href="/pixelate">Pixelate (censor faces)</a>
    <a href="/png-to-ico">PNG to ICO</a>
    <a href="/colorblind">Colorblind Simulator</a>
  </div>
</section>

<style>
  .tool-header { padding: 1.25rem 0 1rem; border-bottom: 2px solid var(--line); margin-bottom: 1.5rem; }
  .tool-title { font-family: var(--display); font-size: 1.1rem; color: var(--accent-3); text-shadow: 3px 3px 0 var(--accent); margin: 0 0 0.5rem; }
  .tool-sub { color: var(--muted); font-size: 0.95rem; margin: 0; }

  .drop-zone {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.5rem; border: 2px dashed var(--line); padding: 3rem 1rem; cursor: pointer;
    text-align: center; transition: border-color 0.12s, background 0.12s;
  }
  .drop-zone:hover, .drop-zone.active { border-color: var(--accent-3); background: rgba(255,255,255,0.03); }
  .drop-main { font-family: var(--display); font-size: 0.6rem; color: var(--ink); }
  .drop-sub { font-size: 0.85rem; color: var(--muted); }
  .file-input { display: none; }
  .hint { color: var(--muted); font-size: 0.85rem; }

  .report { display: grid; grid-template-columns: minmax(0, 320px) 1fr; gap: 1rem; align-items: start; }
  .report-img img { width: 100%; height: auto; display: block; border: 2px solid var(--line); }
  .img-meta { font-size: 0.75rem; color: var(--muted); display: block; margin-top: 0.3rem; }

  .clean-msg { font-family: var(--display); font-size: 0.5rem; color: var(--accent-2); margin: 0 0 0.5rem; }
  .exif-table { width: 100%; border-collapse: collapse; margin-bottom: 0.5rem; }
  .exif-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--line); font-size: 0.9rem; vertical-align: top; }
  .exif-table .k { color: var(--muted); white-space: nowrap; width: 1%; }
  .exif-table .v { color: var(--ink); word-break: break-word; }
  tr.sensitive .v { color: var(--accent); }
  .warn { font-size: 0.75rem; }

  .clean-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; }

  @media (max-width: 640px) {
    .report { grid-template-columns: 1fr; }
  }
</style>
