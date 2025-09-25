<!--
@component
아이콘 버튼 컴포넌트

@example
```svelte
<IconButton icon="add" ariaLabel="추가" on:click={handleAdd} />
```

@props
- icon: string - Material Icons 이름 (필수)
- size: 'sm' | 'md' | 'lg' - 버튼 크기
- variant: 'filled' | 'outlined' | 'text' - 버튼 스타일
- color: 'primary' | 'secondary' | 'error' | 'warning' | 'success' - 색상
- disabled: boolean - 비활성화 여부
- ariaLabel: string - 접근성 라벨 (필수)

@events
- click: 버튼 클릭 이벤트
-->

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Props
	export let icon: string;
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let variant: 'filled' | 'outlined' | 'text' = 'text';
	export let color: 'primary' | 'secondary' | 'error' | 'warning' | 'success' = 'primary';
	export let disabled = false;
	export let ariaLabel: string;

	// 추가 CSS 클래스
	let className = '';
	export { className as class };

	// 이벤트 디스패처
	const dispatch = createEventDispatcher<{
		click: MouseEvent;
	}>();

	// 버튼 클릭 핸들러
	function handleClick(event: MouseEvent) {
		if (disabled) {
			event.preventDefault();
			return;
		}
		dispatch('click', event);
	}

	// 색상 클래스 매핑
	const colorClasses = {
		primary: {
			filled: 'bg-primary text-white hover:bg-primary-600',
			outlined: 'border-primary text-primary hover:bg-primary/10',
			text: 'text-primary hover:bg-primary/10'
		},
		secondary: {
			filled: 'bg-gray-500 text-white hover:bg-gray-600',
			outlined: 'border-gray-500 text-gray-500 hover:bg-gray-50',
			text: 'text-gray-500 hover:bg-gray-100'
		},
		error: {
			filled: 'bg-red-500 text-white hover:bg-red-600',
			outlined: 'border-red-500 text-red-500 hover:bg-red-50',
			text: 'text-red-500 hover:bg-red-100'
		},
		warning: {
			filled: 'bg-yellow-500 text-white hover:bg-yellow-600',
			outlined: 'border-yellow-500 text-yellow-500 hover:bg-yellow-50',
			text: 'text-yellow-600 hover:bg-yellow-100'
		},
		success: {
			filled: 'bg-green-500 text-white hover:bg-green-600',
			outlined: 'border-green-500 text-green-500 hover:bg-green-50',
			text: 'text-green-600 hover:bg-green-100'
		}
	};

	// 동적 클래스 계산
	$: buttonClass = [
		'icon-btn',
		`icon-btn-${size}`,
		colorClasses[color][variant],
		variant === 'outlined' ? 'border' : '',
		'transition-colors duration-200',
		disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
		className
	].filter(Boolean).join(' ');
</script>

<button 
	class={buttonClass}
	{disabled}
	aria-label={ariaLabel}
	on:click={handleClick}
	on:keydown
	on:keyup
	on:focus
	on:blur
>
	<span class="material-symbols-outlined">
		{icon}
	</span>
</button>