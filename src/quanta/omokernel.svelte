<script>
  let components = ["quanta/hello.svelte.js", "quanta/hello2.svelte.js"];
</script>

<svelte:head>
  {#each components as c}
    <script defer src={c}>

    </script>
  {/each}
</svelte:head>

<svelte:options tag="omo-kernel" immutable={true} />
<div class="bg-blue-400">I am the kernel:</div>
<omo-hello />
