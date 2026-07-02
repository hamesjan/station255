<script lang="ts">
  import { toasts } from '$lib/toast-store.svelte';
</script>

{#if toasts.length > 0}
  <div class="toast-stack">
    {#each toasts as t (t.id)}
      <div class="toast">{t.message}</div>
    {/each}
  </div>
{/if}

<style>
  .toast-stack {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }
  .toast {
    background: var(--panel);
    border: 2px solid var(--accent-3);
    color: var(--ink);
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    box-shadow: 4px 4px 0 #000;
    max-width: 280px;
    animation: toast-in 0.15s ease-out;
  }
  @keyframes toast-in {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
