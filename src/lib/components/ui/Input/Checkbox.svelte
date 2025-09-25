<!--
  Checkbox component - 체크박스 입력 필드
  라벨, 설명, 에러 메시지를 포함한 체크박스
-->
<script>
  import { createEventDispatcher } from 'svelte';
  
  /**
   * @type {boolean}
   */
  export let checked = false;
  
  /**
   * @type {string}
   */
  export let label = '';
  
  /**
   * @type {string}
   */
  export let description = '';
  
  /**
   * @type {string}
   */
  export let error = '';
  
  /**
   * @type {boolean}
   */
  export let required = false;
  
  /**
   * @type {boolean}
   */
  export let disabled = false;
  
  /**
   * @type {'sm' | 'md' | 'lg'}
   */
  export let size = 'md';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  /**
   * @type {string}
   */
  export let value = '';
  
  const dispatch = createEventDispatcher();
  
  // Generate unique ID for checkbox
  const checkboxId = `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  $: sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  $: checkboxClasses = [
    'rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50 transition-colors',
    sizeClasses[size],
    error && 'border-red-300 focus:border-red-500 focus:ring-red-200',
    disabled && 'cursor-not-allowed opacity-50',
    customClass
  ].filter(Boolean).join(' ');
  
  function handleChange(event) {
    checked = event.target.checked;
    dispatch('change', { checked, value });
  }
</script>

<div class="flex items-start space-x-3">
  <!-- Checkbox -->
  <input
    id={checkboxId}
    type="checkbox"
    {checked}
    {required}
    {disabled}
    {value}
    class={checkboxClasses}
    on:change={handleChange}
    {...$$restProps}
  />
  
  <!-- Label and Description -->
  {#if label || description || $$slots.default}
    <div class="flex-1 min-w-0">
      {#if label}
        <label for={checkboxId} class="text-sm font-medium text-gray-700 cursor-pointer select-none">
          {label}
          {#if required}
            <span class="text-red-500 ml-1">*</span>
          {/if}
        </label>
      {/if}
      
      {#if description}
        <p class="text-sm text-gray-500 mt-1">
          {description}
        </p>
      {/if}
      
      <slot />
    </div>
  {/if}
</div>

<!-- Error Message -->
{#if error}
  <p class="mt-2 text-sm text-red-600">
    {error}
  </p>
{/if}