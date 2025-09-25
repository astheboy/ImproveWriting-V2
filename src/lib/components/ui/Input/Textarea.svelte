<!--
  Textarea component - 여러 줄 텍스트 입력 영역
  라벨, 에러 메시지, 자동 리사이징 등을 지원
-->
<script>
  import { createEventDispatcher } from 'svelte';
  
  /**
   * @type {string}
   */
  export let value = '';
  
  /**
   * @type {string}
   */
  export let label = '';
  
  /**
   * @type {string}
   */
  export let placeholder = '';
  
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
   * @type {boolean}
   */
  export let readonly = false;
  
  /**
   * @type {number}
   */
  export let rows = 3;
  
  /**
   * @type {number}
   */
  export let maxlength = undefined;
  
  /**
   * @type {number}
   */
  export let minlength = undefined;
  
  /**
   * @type {boolean}
   */
  export let autoResize = false;
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  const dispatch = createEventDispatcher();
  
  // Generate unique ID for textarea
  const textareaId = `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  $: textareaClasses = [
    'w-full border rounded-lg transition-colors focus:outline-none focus:ring-2 resize-vertical',
    'px-4 py-3 text-base',
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 
           'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200',
    disabled && 'bg-gray-100 cursor-not-allowed',
    readonly && 'bg-gray-50',
    autoResize && 'resize-none',
    customClass
  ].filter(Boolean).join(' ');
  
  function handleInput(event) {
    value = event.target.value;
    
    // Auto-resize functionality
    if (autoResize) {
      event.target.style.height = 'auto';
      event.target.style.height = event.target.scrollHeight + 'px';
    }
    
    dispatch('input', event);
  }
  
  function handleFocus(event) {
    dispatch('focus', event);
  }
  
  function handleBlur(event) {
    dispatch('blur', event);
  }
</script>

<div class="w-full">
  <!-- Label -->
  {#if label}
    <label for={textareaId} class="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {#if required}
        <span class="text-red-500 ml-1">*</span>
      {/if}
    </label>
  {/if}
  
  <!-- Textarea -->
  <textarea
    id={textareaId}
    {rows}
    {placeholder}
    {required}
    {disabled}
    {readonly}
    {maxlength}
    {minlength}
    {value}
    class={textareaClasses}
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    {...$$restProps}
  ></textarea>
  
  <!-- Character Count -->
  {#if maxlength}
    <div class="flex justify-between mt-1">
      <div></div>
      <span class="text-xs text-gray-500">
        {value.length}/{maxlength}
      </span>
    </div>
  {/if}
  
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