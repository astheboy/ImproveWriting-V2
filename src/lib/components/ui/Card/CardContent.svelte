<!--
  CardContent component for main card body
  Provides consistent spacing for card content areas
-->
<script>
  /**
   * @type {string}
   */
  export let customClass = '';
  
  /**
   * @type {boolean}
   */
  export let noPadding = false;
  
  $: classes = [
    !noPadding && 'mb-4',
    customClass
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  <slot />
</div>