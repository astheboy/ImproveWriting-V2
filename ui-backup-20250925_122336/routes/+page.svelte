<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Login from '$lib/components/Login.svelte';
	import Dashboard from '$lib/components/Dashboard.svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { doc, getDoc } from 'firebase/firestore';

	let user: any = null;
	let userRole: string = '';
	let isLoading = true;

	onMount(() => {
		// 인증 상태 추적
		return auth.onAuthStateChanged(async (currentUser) => {
			if (currentUser) {
				user = currentUser;
				
				// 사용자 역할 확인
				try {
					const userRef = doc(db, `users/${currentUser.uid}`);
					const userDoc = await getDoc(userRef);
					
					if (userDoc.exists()) {
						userRole = userDoc.data().role || '';
						
						// 역할에 따라 리다이렉션
						if (userRole === 'teacher') {
							goto('/dashboard');
							return;
						} else if (userRole === 'student') {
							goto('/student/classes');
							return;
						}
					}
					
					// 역할이 없으면 기본적으로 교사로 가정 (기존 호환성)
					userRole = 'teacher';
				} catch (error) {
					console.error('사용자 역할 확인 오류:', error);
				}
			} else {
				user = null;
				userRole = '';
			}
			
			isLoading = false;
		});
	});
</script>

<main>
	{#if isLoading}
		<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
			<div class="text-center">
				<div class="text-6xl mb-4">🚀</div>
				<p class="text-gray-600 text-lg">로딩 중입니다...</p>
			</div>
		</div>
	{:else if user && userRole === 'teacher'}
		<Dashboard />
	{:else if user && userRole === 'student'}
		<!-- 학생은 자동으로 /student/classes로 리다이렉션되지만 혹시를 대비한 폴백 -->
		<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
			<div class="text-center">
				<div class="text-6xl mb-4">🎓</div>
				<p class="text-gray-600 text-lg mb-4">학생 페이지로 이동 중입니다...</p>
				<a href="/student/classes" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
					내 클래스 보기
				</a>
			</div>
		</div>
	{:else}
		<Login />
	{/if}
</main>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
	<title>상상력을 펼치는 글쓰기 - 홈</title>
</svelte:head>
