<!--
  CardHeader component for card titles and metadata
  Provides consistent spacing and typography for card headers
-->
<script>
  /**
   * @type {string}
   */
  export let title = '';
  
  /**
   * @type {string}
   */
  export let subtitle = '';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  $: classes = [
    'mb-4',
    customClass
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  {#if title}
    <h3 class="text-xl font-bold text-gray-900 mb-1">
      {title}
    </h3>
  {/if}
  
  {#if subtitle}
    <p class="text-sm text-gray-600">
      {subtitle}
    </p>
  {/if}
  
  <slot />
</div>