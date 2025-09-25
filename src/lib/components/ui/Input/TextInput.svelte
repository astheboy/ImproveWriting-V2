<!--
  TextInput component - 텍스트 입력 필드
  라벨, 에러 메시지, 아이콘 등을 포함한 완전한 입력 컴포넌트
-->
<script>
  import { createEventDispatcher } from 'svelte';
  
  /**
   * @type {string}
   */
  export let value = '';
  
  /**
   * @type {'text' | 'password' | 'email' | 'number' | 'tel' | 'url'}
   */
  export let type = 'text';
  
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
   * @type {string}
   */
  export let leftIcon = '';
  
  /**
   * @type {string}
   */
  export let rightIcon = '';
  
  /**
   * @type {'sm' | 'md' | 'lg'}
   */
  export let size = 'md';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  /**
   * @type {number}
   */
  export let maxlength = undefined;
  
  /**
   * @type {number}
   */
  export let minlength = undefined;
  
  const dispatch = createEventDispatcher();
  
  // Generate unique ID for input
  const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  
  $: sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg'
  };
  
  $: inputClasses = [
    'w-full border rounded-lg transition-colors focus:outline-none focus:ring-2',
    sizeClasses[size],
    leftIcon && 'pl-12',
    rightIcon && 'pr-12',
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 
           'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200',
    disabled && 'bg-gray-100 cursor-not-allowed',
    readonly && 'bg-gray-50',
    customClass
  ].filter(Boolean).join(' ');
  
  function handleInput(event) {
    value = event.target.value;
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
    <label for={inputId} class="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {#if required}
        <span class="text-red-500 ml-1">*</span>
      {/if}
    </label>
  {/if}
  
  <!-- Input Container -->
  <div class="relative">
    <!-- Left Icon -->
    {#if leftIcon}
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span class="material-symbols-outlined text-gray-400 text-xl">
          {leftIcon}
        </span>
      </div>
    {/if}
    
    <!-- Input -->
    <input
      id={inputId}
      {type}
      {placeholder}
      {required}
      {disabled}
      {readonly}
      {maxlength}
      {minlength}
      {value}
      class={inputClasses}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={handleBlur}
      {...$$restProps}
    />
    
    <!-- Right Icon -->
    {#if rightIcon}
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <span class="material-symbols-outlined text-gray-400 text-xl">
          {rightIcon}
        </span>
      </div>
    {/if}
  </div>
  
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