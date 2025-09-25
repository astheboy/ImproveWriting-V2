<!--
  Modal component - 기본 모달 다이얼로그
  오버레이와 중앙 정렬된 컨텐츠 영역을 제공
-->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  
  /**
   * @type {boolean}
   */
  export let open = false;
  
  /**
   * @type {'sm' | 'md' | 'lg' | 'xl' | 'full'}
   */
  export let size = 'md';
  
  /**
   * @type {boolean}
   */
  export let closeOnEscape = true;
  
  /**
   * @type {boolean}
   */
  export let closeOnBackdrop = true;
  
  /**
   * @type {boolean}
   */
  export let showCloseButton = true;
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  const dispatch = createEventDispatcher();
  
  $: sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-full mx-4'
  };
  
  $: modalClasses = [
    'relative bg-white rounded-2xl shadow-2xl w-full',
    sizeClasses[size],
    customClass
  ].filter(Boolean).join(' ');
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleKeydown(event) {
    if (closeOnEscape && event.key === 'Escape') {
      handleClose();
    }
  }
  
  function handleBackdropClick(event) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      handleClose();
    }
  }
  
  onMount(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  });
  
  $: if (open) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal Content -->
    <div 
      class={modalClasses} 
      role="document"
      on:click|stopPropagation
    >
      <!-- Close Button -->
      {#if showCloseButton}
        <button 
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          on:click={handleClose}
          aria-label="모달 닫기"
        >
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      {/if}
      
      <!-- Modal Body -->
      <slot />
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
</style>