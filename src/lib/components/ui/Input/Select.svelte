<!--
  Select component - 드롭다운 선택 필드
  옵션 배열을 받아 선택 가능한 드롭다운을 생성
-->
<script>
  import { createEventDispatcher } from 'svelte';
  
  /**
   * @type {string | number}
   */
  export let value = '';
  
  /**
   * @type {Array<{value: string | number, label: string, disabled?: boolean}>}
   */
  export let options = [];
  
  /**
   * @type {string}
   */
  export let label = '';
  
  /**
   * @type {string}
   */
  export let placeholder = '선택해주세요';
  
  /**
   * @type {string}
   */
  export let error = '';
  
  /**
   * @type {string}
   */
  export let hint = '';
  
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
  
  const dispatch = createEventDispatcher();
  
  // Generate unique ID for select
  const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;
  
  $: sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  };
  
  $: selectClasses = [
    'w-full border rounded-lg transition-colors focus:outline-none focus:ring-2 bg-white',
    sizeClasses[size],
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 
           'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200',
    disabled && 'bg-gray-100 cursor-not-allowed',
    customClass
  ].filter(Boolean).join(' ');
  
  function handleChange(event) {
    const selectedValue = event.target.value;
    // Try to convert to number if original option value was a number
    const selectedOption = options.find(opt => String(opt.value) === selectedValue);
    value = selectedOption ? selectedOption.value : selectedValue;
    dispatch('change', { value, option: selectedOption });
  }
</script>

<div class="w-full">
  <!-- Label -->
  {#if label}
    <label for={selectId} class="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {#if required}
        <span class="text-red-500 ml-1">*</span>
      {/if}
    </label>
  {/if}
  
  <!-- Select -->
  <select
    id={selectId}
    {required}
    {disabled}
    value={String(value)}
    class={selectClasses}
    on:change={handleChange}
    {...$$restProps}
  >
    <!-- Placeholder option -->
    {#if placeholder}
      <option value="" disabled={required}>
        {placeholder}
      </option>
    {/if}
    
    <!-- Options -->
    {#each options as option}
      <option 
        value={String(option.value)} 
        disabled={option.disabled}
      >
        {option.label}
      </option>
    {/each}
  </select>
  
  <!-- Error Message -->
  {#if error}
    <p class="mt-2 text-sm text-red-600">
      {error}
    </p>
  {/if}
  
  <!-- Hint Message -->
  {#if hint && !error}
    <p class="mt-2 text-sm text-gray-500">
      {hint}
    </p>
  {/if}
</div>