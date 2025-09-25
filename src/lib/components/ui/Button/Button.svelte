<!--
@component
기본 버튼 컴포넌트

@example
```svelte
<Button variant="primary" on:click={handleClick}>
  클릭하세요
</Button>
```

@props
- variant: 'primary' | 'secondary' | 'outline' | 'ghost' - 버튼 스타일
- size: 'sm' | 'md' | 'lg' | 'xl' - 버튼 크기
- disabled: boolean - 비활성화 여부
- loading: boolean - 로딩 상태
- fullWidth: boolean - 전체 너비 사용
- type: 'button' | 'submit' | 'reset' - 버튼 타입
- href: string - 링크로 사용할 경우

@events
- click: 버튼 클릭 이벤트

@slots
- default: 버튼 텍스트 내용
- icon: 아이콘 슬롯 (왼쪽)
- icon-right: 오른쪽 아이콘 슬롯
-->

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Props
	export let variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary';
	export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let disabled = false;
	export let loading = false;
	export let fullWidth = false;
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let href: string | undefined = undefined;
	export let target: string | undefined = undefined;

	// 추가 CSS 클래스
	let className = '';
	export { className as class };

	// 이벤트 디스패처
	const dispatch = createEventDispatcher<{
		click: MouseEvent;
	}>();

	// 버튼 클릭 핸들러
	function handleClick(event: MouseEvent) {
		if (disabled || loading) {
			event.preventDefault();
			return;
		}
		dispatch('click', event);
	}

	// 동적 클래스 계산
	$: buttonClass = [
		'btn',
		`btn-${variant}`,
		`btn-${size}`,
		fullWidth ? 'w-full' : '',
		loading ? 'cursor-wait' : '',
		className
	].filter(Boolean).join(' ');

	// 버튼 속성
	$: buttonProps = {
		type,
		disabled: disabled || loading,
		'aria-disabled': disabled || loading,
		class: buttonClass
	};
</script>

{#if href}
	<!-- 링크로 사용 -->
	<a 
		{href} 
		{target}
		class={buttonClass}
		aria-disabled={disabled || loading}
		on:click={handleClick}
		role="button"
		tabindex={disabled || loading ? -1 : 0}
	>
		{#if loading}
			<div class="loading-spinner w-5 h-5 mr-2"></div>
		{:else if $$slots.icon}
			<span class="mr-2">
				<slot name="icon" />
			</span>
		{/if}

		<slot />

		{#if !loading && $$slots['icon-right']}
			<span class="ml-2">
				<slot name="icon-right" />
			</span>
		{/if}
	</a>
{:else}
	<!-- 일반 버튼으로 사용 -->
	<button 
		{...buttonProps}
		on:click={handleClick}
		on:keydown
		on:keyup
		on:focus
		on:blur
	>
		{#if loading}
			<div class="loading-spinner w-5 h-5 mr-2"></div>
		{:else if $$slots.icon}
			<span class="mr-2">
				<slot name="icon" />
			</span>
		{/if}

		<slot />

		{#if !loading && $$slots['icon-right']}
			<span class="ml-2">
				<slot name="icon-right" />
			</span>
		{/if}
	</button>
{/if}