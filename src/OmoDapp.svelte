<script lang="ts">
  let components = [
    "quanta/omo-hello.svelte.js",
    "quanta/omo-button.svelte.js",
  ];
</script>

<style global>
  @tailwind base;
</style>

<svelte:head>
  {#each components as c}
    <script defer src={c}>

    </script>
  {/each}
</svelte:head>

<omo-button />
<omo-hello />
