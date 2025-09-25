<!--
  CardActions component for action buttons in card footers
  Provides consistent spacing and alignment for card action areas
-->
<script>
  /**
   * @type {'left' | 'right' | 'center' | 'between' | 'around'}
   */
  export let align = 'right';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  $: alignmentClasses = {
    left: 'justify-start',
    right: 'justify-end', 
    center: 'justify-center',
    between: 'justify-between',
    around: 'justify-around'
  };
  
  $: classes = [
    'flex items-center gap-3 pt-4 border-t border-gray-100',
    alignmentClasses[align],
    customClass
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  <slot />
</div>