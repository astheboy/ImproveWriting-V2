<!--
  ModalContent component - 모달 컨텐츠 영역
  메인 내용을 담는 스크롤 가능한 영역
-->
<script>
  /**
   * @type {string}
   */
  export let customClass = '';
  
  /**
   * @type {boolean}
   */
  export let scrollable = true;
  
  /**
   * @type {number}
   */
  export let maxHeight = 0;
  
  $: classes = [
    'px-8 py-4',
    scrollable && 'overflow-y-auto',
    customClass
  ].filter(Boolean).join(' ');
  
  $: style = maxHeight > 0 ? `max-height: ${maxHeight}px;` : '';
</script>

<div class={classes} {style}>
  <slot />
</div>