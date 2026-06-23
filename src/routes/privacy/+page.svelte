<svelte:head>
  <title>Privacy Policy — Station255</title>
  <meta
    name="description"
    content="Station255 privacy policy. We collect minimal anonymous analytics. Your images and files never leave your browser. No ads, no third-party trackers."
  />
</svelte:head>

<h1>Privacy Policy</h1>
<p class="updated">Last updated: June 2025</p>

<div class="panel section">
  <h2>Your files stay in your browser</h2>
  <p>
    Every tool on Station255 runs entirely client-side. Images, text, and any other input you
    provide are processed locally in your browser using HTML5 Canvas and standard browser APIs.
    <strong>Nothing you upload or type is ever sent to our servers.</strong>
  </p>
</div>

<div class="panel section">
  <h2>What we collect</h2>
  <p>If you accept the cookie notice, we collect the following anonymous data:</p>
  <ul class="list">
    <li><strong>Page URL</strong> — which tool or page you visited (e.g. <code>/demake</code>).</li>
    <li><strong>Event type</strong> — whether you viewed a page, used a tool, or exported a file.</li>
    <li><strong>Referrer</strong> — the URL of the site that linked to us (from <code>document.referrer</code>).</li>
    <li><strong>Session ID</strong> — a random UUID generated in your browser and stored in <code>localStorage</code> under the key <code>s255_sid</code>. This is not tied to any personal identity.</li>
    <li><strong>IP address</strong> — collected server-side by Caddy when the beacon is received. The last octet is masked in our dashboard (e.g. <code>1.2.3.x</code>). We do not log or store full IP addresses long-term.</li>
    <li><strong>User agent</strong> — your browser and OS, from the HTTP request header.</li>
  </ul>
</div>

<div class="panel section">
  <h2>What we do NOT collect</h2>
  <ul class="list">
    <li>Your images, files, or any tool input.</li>
    <li>Your name, email, or any personally identifying information.</li>
    <li>Advertising identifiers or cross-site tracking.</li>
    <li>Third-party cookies or trackers.</li>
  </ul>
</div>

<div class="panel section">
  <h2>Storage &amp; third parties</h2>
  <p>
    Analytics data is stored in a SQLite database on our own server (a DigitalOcean VPS).
    It is not shared with, sold to, or processed by any third party. We do not use Google
    Analytics, Meta Pixel, or any advertising network.
  </p>
  <p>
    We use <strong>localStorage</strong> (not cookies) to store your session ID
    (<code>s255_sid</code>) and your consent choice (<code>s255_consent</code>).
    These values never leave your browser except as part of the analytics beacon payload.
  </p>
</div>

<div class="panel section">
  <h2>How to opt out</h2>
  <p>
    If you declined the cookie notice, no analytics data is collected.
    To change your choice, open your browser's developer tools, go to
    Application → Local Storage → <code>station255.com</code>, and delete or change the
    <code>s255_consent</code> key. Reload the page to see the notice again.
  </p>
  <p>Alternatively, use a content blocker that blocks the <code>/collect</code> path.</p>
</div>

<div class="panel section">
  <h2>Contact</h2>
  <p>Questions about this policy? Reach out via the contact information on the <a href="/about">About</a> page.</p>
</div>

<style>
  h1 { margin-bottom: 0.25rem; }
  .updated { color: var(--muted); font-size: 1rem; margin-bottom: 1.25rem; }
  .section { margin-bottom: 1rem; }
  .section h2 { font-size: 0.8rem; margin-top: 0; color: var(--accent-3); }
  .section p { color: var(--muted); font-size: 1.05rem; margin: 0.5rem 0; line-height: 1.6; }
  .section p:first-of-type { margin-top: 0; }
  .list {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .list li {
    color: var(--muted);
    font-size: 1rem;
    padding-left: 1.1rem;
    position: relative;
    line-height: 1.5;
  }
  .list li::before { content: '▸'; position: absolute; left: 0; color: var(--accent); }
  .list strong { color: var(--ink); }
  code { background: var(--bg); padding: 0.1rem 0.3rem; font-family: var(--pixel); font-size: 0.9rem; }
</style>
