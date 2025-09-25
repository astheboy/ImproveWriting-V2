<!--
  Progress component - 진행률 표시 바
  백분율로 진행 상황을 시각적으로 표시
-->
<script>
  /**
   * @type {number}
   */
  export let value = 0;
  
  /**
   * @type {number}
   */
  export let max = 100;
  
  /**
   * @type {string}
   */
  export let label = '';
  
  /**
   * @type {boolean}
   */
  export let showPercent = false;
  
  /**
   * @type {'sm' | 'md' | 'lg'}
   */
  export let size = 'md';
  
  /**
   * @type {'primary' | 'success' | 'warning' | 'error'}
   */
  export let color = 'primary';
  
  /**
   * @type {boolean}
   */
  export let animated = false;
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  $: percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  $: sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  $: colorClasses = {
    primary: 'bg-indigo-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };
  
  $: progressClasses = [
    'w-full bg-gray-200 rounded-full overflow-hidden',
    sizeClasses[size],
    customClass
  ].filter(Boolean).join(' ');
  
  $: barClasses = [
    'h-full transition-all duration-300 ease-out',
    colorClasses[color],
    animated && 'animate-pulse'
  ].filter(Boolean).join(' ');
</script>

<div class="w-full">
  <!-- Label and Percentage -->
  {#if label || showPercent}
    <div class="flex justify-between items-center mb-2">
      {#if label}
        <span class="text-sm font-medium text-gray-700">
          {label}
        </span>
      {/if}
      
      {#if showPercent}
        <span class="text-sm text-gray-500">
          {Math.round(percentage)}%
        </span>
      {/if}
    </div>
  {/if}
  
  <!-- Progress Bar -->
  <div class={progressClasses} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
    <div 
      class={barClasses}
      style="width: {percentage}%"
    ></div>
  </div>
  
  <!-- Custom Content -->
  <slot {value} {max} {percentage} />
</div>