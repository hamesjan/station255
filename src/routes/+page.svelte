<script lang="ts">
  import { tools } from '$lib/tools';
</script>

<svelte:head>
  <title>Station255 — the 8-bit tool arcade | free pixel-art tools</title>
  <meta
    name="description"
    content="Station255 is an arcade of small, fast, free pixel-art and retro web tools — palette extractors, demakers, CRT effects and more. Runs entirely in your browser."
  />
</svelte:head>

<section class="hero">
  <h1>INSERT COIN</h1>
  <p>A growing arcade of tiny, fast, free <strong>pixel-art &amp; retro</strong> tools. Pick a cabinet.</p>
</section>

<section class="grid">
  {#each tools as tool}
    {#if tool.live}
      <a class="cab" href="/{tool.slug}">
        <span class="icon">{tool.icon}</span>
        <span class="name">{tool.name}</span>
        <span class="tag">{tool.tagline}</span>
      </a>
    {:else}
      <div class="cab soon" aria-disabled="true">
        <span class="badge">SOON</span>
        <span class="icon">{tool.icon}</span>
        <span class="name">{tool.name}</span>
        <span class="tag">{tool.tagline}</span>
      </div>
    {/if}
  {/each}
</section>

<style>
  .hero {
    text-align: center;
    padding: 2rem 0 1rem;
  }
  .hero h1 {
    font-size: 1.8rem;
    color: var(--accent-3);
    text-shadow: 3px 3px 0 var(--accent);
    animation: blink 1.4s steps(2, start) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.55;
    }
  }
  .hero p {
    color: var(--muted);
    font-size: 1.25rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .cab {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: var(--panel);
    border: 2px solid var(--line);
    padding: 1.2rem 1rem;
    box-shadow: 5px 5px 0 #000;
    transition: transform 0.06s ease;
  }
  .cab:not(.soon):hover {
    transform: translate(2px, 2px);
    box-shadow: 3px 3px 0 #000;
    border-color: var(--accent-2);
  }
  .cab .icon {
    font-size: 2rem;
  }
  .cab .name {
    font-family: var(--display);
    font-size: 0.8rem;
    color: var(--ink);
  }
  .cab .tag {
    color: var(--muted);
    font-size: 1.1rem;
  }
  .soon {
    opacity: 0.6;
  }
  .badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-family: var(--display);
    font-size: 0.5rem;
    color: #000;
    background: var(--accent-3);
    padding: 0.2rem 0.35rem;
  }
</style>
