<script lang="ts">
  let { svg }: { svg: string } = $props();
</script>

<span class="pi">{@html svg}</span>

<style>
  .pi {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    line-height: 0;
  }
  .pi :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
