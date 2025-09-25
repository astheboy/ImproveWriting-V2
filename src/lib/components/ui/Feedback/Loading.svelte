<!--
  Loading component - 로딩 인디케이터
  다양한 크기와 스타일의 로딩 스피너
-->
<script>
  /**
   * @type {'sm' | 'md' | 'lg' | 'xl'}
   */
  export let size = 'md';
  
  /**
   * @type {string}
   */
  export let message = '';
  
  /**
   * @type {'spinner' | 'dots' | 'pulse'}
   */
  export let type = 'spinner';
  
  /**
   * @type {'primary' | 'secondary' | 'white'}
   */
  export let color = 'primary';
  
  /**
   * @type {boolean}
   */
  export let fullScreen = false;
  
  /**
   * @type {boolean}
   */
  export let center = false;
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  $: sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };
  
  $: colorClasses = {
    primary: 'border-indigo-600',
    secondary: 'border-gray-600',
    white: 'border-white'
  };
  
  $: spinnerClasses = [
    'animate-spin rounded-full border-2 border-transparent',
    sizeClasses[size],
    `${colorClasses[color]} border-t-current`,
    customClass
  ].filter(Boolean).join(' ');
  
  $: containerClasses = [
    fullScreen && 'fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center',
    center && !fullScreen && 'flex items-center justify-center',
    !center && !fullScreen && 'inline-flex items-center'
  ].filter(Boolean).join(' ');
</script>

<div class={containerClasses}>
  <div class="flex flex-col items-center gap-3">
    <!-- Spinner Type -->
    {#if type === 'spinner'}
      <div class={spinnerClasses}></div>
    {:else if type === 'dots'}
      <div class="flex space-x-1">
        {#each Array(3) as _, i}
          <div 
            class="rounded-full bg-current {sizeClasses[size]} animate-pulse"
            style="animation-delay: {i * 0.2}s"
          ></div>
        {/each}
      </div>
    {:else if type === 'pulse'}
      <div class="rounded-full bg-current {sizeClasses[size]} animate-pulse"></div>
    {/if}
    
    <!-- Loading Message -->
    {#if message}
      <p class="text-sm text-gray-600 font-medium">
        {message}
      </p>
    {/if}
    
    <!-- Slot for custom content -->
    <slot />
  </div>
</div>