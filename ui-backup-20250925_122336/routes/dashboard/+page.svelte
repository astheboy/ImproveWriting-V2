<script lang="ts">
	import { onMount } from 'svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import { auth } from '$lib/firebase/firebase';
	import { goto } from '$app/navigation';

	onMount(() => {
		// 인증 상태 확인
		const unsubscribe = auth.onAuthStateChanged((user) => {
			if (!user) {
				// 로그인되지 않은 경우 홈으로 리디렉션
				goto('/');
			}
		});

		return unsubscribe;
	});
</script>

<Dashboard />