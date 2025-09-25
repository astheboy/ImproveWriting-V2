<!--
  ModalHeader component - 모달 헤더 영역
  제목, 부제목, 아이콘을 포함한 모달 상단 영역
-->
<script>
  /**
   * @type {string}
   */
  export let title = '';
  
  /**
   * @type {string}
   */
  export let subtitle = '';
  
  /**
   * @type {string}
   */
  export let icon = '';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  $: classes = [
    'px-8 pt-8 pb-4 text-center',
    customClass
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  {#if icon}
    <div class="text-6xl mb-4">
      {icon}
    </div>
  {/if}
  
  {#if title}
    <h3 class="text-2xl font-bold text-gray-800 mb-2">
      {title}
    </h3>
  {/if}
  
  {#if subtitle}
    <p class="text-gray-600">
      {subtitle}
    </p>
  {/if}
  
  <slot />
</div>