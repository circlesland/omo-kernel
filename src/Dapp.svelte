<script lang="ts">
  let components = ["quanta/omo-core.svelte.js"];
</script>

<style global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
</style>

<svelte:head>
  {#each components as c}
    <script defer src={c}>

    </script>
  {/each}
</svelte:head>

<omo-core />
