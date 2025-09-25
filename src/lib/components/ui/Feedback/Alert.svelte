<!--
  Alert component - 알림 메시지
  다양한 타입의 알림을 표시하는 컴포넌트
-->
<script>
  import { createEventDispatcher } from 'svelte';
  
  /**
   * @type {'info' | 'success' | 'warning' | 'error'}
   */
  export let type = 'info';
  
  /**
   * @type {string}
   */
  export let title = '';
  
  /**
   * @type {string}
   */
  export let message = '';
  
  /**
   * @type {boolean}
   */
  export let dismissible = false;
  
  /**
   * @type {boolean}
   */
  export let show = true;
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  const dispatch = createEventDispatcher();
  
  $: typeConfig = {
    info: {
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-200',
      textClass: 'text-blue-800',
      iconClass: 'text-blue-400',
      icon: 'info'
    },
    success: {
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200', 
      textClass: 'text-green-800',
      iconClass: 'text-green-400',
      icon: 'check_circle'
    },
    warning: {
      bgClass: 'bg-yellow-50',
      borderClass: 'border-yellow-200',
      textClass: 'text-yellow-800',
      iconClass: 'text-yellow-400',
      icon: 'warning'
    },
    error: {
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
      textClass: 'text-red-800',
      iconClass: 'text-red-400',
      icon: 'error'
    }
  };
  
  $: config = typeConfig[type];
  
  $: alertClasses = [
    'border rounded-lg p-4',
    config.bgClass,
    config.borderClass,
    customClass
  ].filter(Boolean).join(' ');
  
  function handleDismiss() {
    show = false;
    dispatch('dismiss');
  }
</script>

{#if show}
  <div class={alertClasses} role="alert">
    <div class="flex items-start">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <span class="material-symbols-outlined {config.iconClass} text-xl">
          {config.icon}
        </span>
      </div>
      
      <!-- Content -->
      <div class="ml-3 flex-1 min-w-0">
        {#if title}
          <h3 class="text-sm font-medium {config.textClass}">
            {title}
          </h3>
        {/if}
        
        {#if message}
          <div class="text-sm {config.textClass} {title ? 'mt-1' : ''}">
            {message}
          </div>
        {/if}
        
        {#if $$slots.default}
          <div class="text-sm {config.textClass} {title || message ? 'mt-2' : ''}">
            <slot />
          </div>
        {/if}
      </div>
      
      <!-- Dismiss Button -->
      {#if dismissible}
        <div class="ml-auto flex-shrink-0">
          <button
            type="button"
            class="inline-flex rounded-md {config.bgClass} p-1.5 {config.textClass} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-{type}-50 focus:ring-{type}-600"
            on:click={handleDismiss}
            aria-label="알림 닫기"
          >
            <span class="material-symbols-outlined w-5 h-5">
              close
            </span>
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}