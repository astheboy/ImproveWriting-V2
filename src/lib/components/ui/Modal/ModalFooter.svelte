<!--
  ModalFooter component - 모달 푸터 영역
  액션 버튼들을 배치하는 하단 영역
-->
<script>
  /**
   * @type {'left' | 'right' | 'center' | 'between' | 'around'}
   */
  export let align = 'right';
  
  /**
   * @type {string}
   */
  export let customClass = '';
  
  /**
   * @type {boolean}
   */
  export let bordered = true;
  
  $: alignmentClasses = {
    left: 'justify-start',
    right: 'justify-end', 
    center: 'justify-center',
    between: 'justify-between',
    around: 'justify-around'
  };
  
  $: classes = [
    'px-8 py-6 flex items-center gap-3',
    alignmentClasses[align],
    bordered && 'border-t border-gray-100',
    customClass
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  <slot />
</div>