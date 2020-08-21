<style>
  .btn-primary {
    @apply bg-red-300 text-white font-bold py-2 px-4 rounded;
  }
  .btn-primary:hover {
    @apply bg-green-500;
  }
</style>

<div class="btn-primary">Button</div>

<svelte:options tag="omo-button" immutable={true} />
