<script lang="ts">
  let components = ["quanta/omo-hello.svelte.js"];
</script>

<svelte:head>
  {#each components as c}
    <script defer src={c}>

    </script>
  {/each}
</svelte:head>
<svelte:options tag="omo-core" immutable={true} />

<omo-hello />
