<!--
  Card component for content containers
  Provides elevation, borders, and padding for card layouts
-->
<script>
  /**
   * @type {'flat' | 'raised' | 'outlined'}
   */
  export let variant = 'flat';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  /**
   * @type {boolean}
   */
  export let padding = true;
  
  /**
   * @type {boolean}
   */
  export let hover = false;
  
  /**
   * @type {boolean}
   */
  export let clickable = false;
  
  $: classes = [
    'bg-white rounded-lg',
    variant === 'raised' && 'shadow-md hover:shadow-lg transition-shadow',
    variant === 'outlined' && 'border border-gray-200',
    variant === 'flat' && 'border border-transparent',
    padding && 'p-6',
    hover && 'hover:shadow-md transition-shadow',
    clickable && 'cursor-pointer',
    customClass
  ].filter(Boolean).join(' ');
</script>

<div 
  class={classes} 
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
  on:click
  on:keydown={(e) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.currentTarget.dispatchEvent(new CustomEvent('click', { detail: e }));
    }
  }}
>
  <slot />
</div>
