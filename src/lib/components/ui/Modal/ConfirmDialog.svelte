<!--
  ConfirmDialog component - 확인/취소 대화상자
  사용자의 확인이 필요한 액션에 사용
-->
<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  
  /**
   * @type {boolean}
   */
  export let open = false;
  
  /**
   * @type {string}
   */
  export let title = '';
  
  /**
   * @type {string}
   */
  export let message = '';
  
  /**
   * @type {string}
   */
  export let icon = '⚠️';
  
  /**
   * @type {'warning' | 'danger' | 'info' | 'success'}
   */
  export let type = 'warning';
  
  /**
   * @type {string}
   */
  export let confirmText = '확인';
  
  /**
   * @type {string}
   */
  export let cancelText = '취소';
  
  /**
   * @type {boolean}
   */
  export let loading = false;
  
  const dispatch = createEventDispatcher();
  
  $: typeConfig = {
    warning: {
      icon: '⚠️',
      confirmClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      headerClass: 'text-yellow-600'
    },
    danger: {
      icon: '🚨',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      headerClass: 'text-red-600'
    },
    info: {
      icon: 'ℹ️',
      confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
      headerClass: 'text-blue-600'
    },
    success: {
      icon: '✅',
      confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
      headerClass: 'text-green-600'
    }
  };
  
  $: config = typeConfig[type];
  $: displayIcon = icon || config.icon;
  
  function handleConfirm() {
    dispatch('confirm');
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
  
  function handleClose() {
    dispatch('close');
  }
</script>

<Modal 
  {open} 
  size="sm" 
  closeOnEscape={!loading}
  closeOnBackdrop={!loading}
  showCloseButton={!loading}
  on:close={handleClose}
>
  <ModalHeader 
    {title}
    icon={displayIcon}
    customClass={config.headerClass}
  />
  
  <ModalContent>
    {#if message}
      <p class="text-gray-600 text-center leading-relaxed">
        {message}
      </p>
    {/if}
    <slot />
  </ModalContent>
  
  <ModalFooter align="between">
    <button 
      type="button"
      on:click={handleCancel}
      disabled={loading}
      class="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
    >
      {cancelText}
    </button>
    
    <button 
      type="button"
      on:click={handleConfirm}
      disabled={loading}
      class="flex-1 font-medium py-3 px-4 rounded-lg transition-colors {config.confirmClass} disabled:opacity-50"
    >
      {#if loading}
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          처리중...
        </div>
      {:else}
        {confirmText}
      {/if}
    </button>
  </ModalFooter>
</Modal>