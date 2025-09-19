<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ClassManagement from '$lib/components/ClassManagement.svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { doc, getDoc } from 'firebase/firestore';

	let classId = '';
	let classData: any = null;
	let user: any = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		// URL에서 클래스 ID 가져오기
		classId = $page.params.id;

		// 사용자 인증 확인
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			if (!currentUser) {
				goto('/');
				return;
			}

			user = currentUser;

			try {
				// 클래스 정보 가져오기
				const classDoc = await getDoc(doc(db, 'classrooms', classId));
				
				if (!classDoc.exists()) {
					error = '존재하지 않는 클래스입니다.';
					loading = false;
					return;
				}

				const data = classDoc.data();
				
				// 클래스 소유자 확인
				if (data.teacherId !== currentUser.uid) {
					error = '이 클래스에 접근할 권한이 없습니다.';
					loading = false;
					return;
				}

				classData = { id: classDoc.id, ...data };
				loading = false;
			} catch (err) {
				console.error('Error loading class:', err);
				error = '클래스 정보를 불러오는 중 오류가 발생했습니다.';
				loading = false;
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>클래스 관리 - {classData?.className || '로딩중...'}</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-100 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
			<p class="text-gray-600">클래스 정보를 불러오는 중...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen bg-gray-100 flex items-center justify-center">
		<div class="text-center">
			<div class="text-red-500 text-6xl mb-4">⚠️</div>
			<h2 class="text-2xl font-bold text-gray-800 mb-2">오류 발생</h2>
			<p class="text-gray-600 mb-4">{error}</p>
			<button 
				on:click={() => goto('/dashboard')}
				class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
			>
				대시보드로 돌아가기
			</button>
		</div>
	</div>
{:else if classData}
	<ClassManagement {classData} />
{/if}
