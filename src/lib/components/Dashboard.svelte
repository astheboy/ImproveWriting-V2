<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
	import { goto } from '$app/navigation';

	let user: any = null;
	let classrooms: any[] = [];
	let newClassName = '';
	let isLoading = false;

	onMount(() => {
		// 사용자 상태 구독
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			if (currentUser) {
				user = currentUser;
				loadClassrooms();
			} else {
				goto('/');
			}
		});

		return unsubscribe;
	});

	// 클래스룸 목록 로드
	function loadClassrooms() {
		if (!user) return;

		const classroomsRef = collection(db, 'classrooms');
		const q = query(classroomsRef, where('teacherId', '==', user.uid));
		
		onSnapshot(q, (snapshot) => {
			classrooms = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
	}

	// 로그아웃 처리
	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/');
		} catch (error) {
			console.error('Logout error:', error);
		}
	}

	// 새 클래스 생성
	async function createClass() {
		if (!newClassName.trim() || !user) return;

		try {
			isLoading = true;
			
			// 6자리 랜덤 코드 생성
			const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
			
			await addDoc(collection(db, 'classrooms'), {
				className: newClassName.trim(),
				teacherId: user.uid,
				joinCode: joinCode,
				createdAt: new Date()
			});

			newClassName = '';
		} catch (error) {
			console.error('Create class error:', error);
		} finally {
			isLoading = false;
		}
	}

	// 클래스 입장
	function enterClass(classId: string) {
		goto(`/class/${classId}`);
	}
</script>

<svelte:head>
	<title>교사 대시보드 - 상상력을 펼치는 글쓰기</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="min-h-screen bg-gray-100 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6">
		<!-- 헤더 -->
		<div class="flex justify-between items-center border-b pb-4">
			<div>
				<h2 class="text-3xl font-bold text-gray-800">
					{user?.displayName || 'OOO'}님의 대시보드
				</h2>
				<p class="text-gray-600">나의 클래스를 만들고 관리하세요.</p>
			</div>
			<button 
				on:click={handleLogout}
				class="bg-gray-200 hover:bg-gray-300 text-sm text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
			>
				로그아웃
			</button>
		</div>

		<!-- 새 클래스 만들기 -->
		<div class="p-4 bg-gray-50 rounded-lg border">
			<h3 class="text-lg font-bold text-gray-700 mb-2">새 클래스 만들기</h3>
			<div class="flex gap-2">
				<input 
					type="text" 
					bind:value={newClassName}
					placeholder="클래스 이름을 입력하세요"
					disabled={isLoading}
					class="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					on:keypress={(e) => e.key === 'Enter' && createClass()}
				>
				<button 
					on:click={createClass}
					disabled={isLoading || !newClassName.trim()}
					class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
				>
					{#if isLoading}
						<div class="flex items-center">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
							생성중...
						</div>
					{:else}
						추가
					{/if}
				</button>
			</div>
		</div>

		<!-- 클래스 목록 -->
		<div>
			<h3 class="text-xl font-bold text-gray-700 mb-4">내 클래스 목록</h3>
			
			{#if classrooms.length === 0}
				<div class="text-center py-12">
					<div class="text-gray-400 text-6xl mb-4">📚</div>
					<p class="text-gray-500 text-lg">아직 생성된 클래스가 없습니다.</p>
					<p class="text-gray-400">위에서 새 클래스를 만들어보세요!</p>
				</div>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each classrooms as classroom}
						<div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
							<div class="flex justify-between items-start mb-3">
								<h4 class="text-lg font-bold text-gray-800">{classroom.className}</h4>
								<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
									{classroom.joinCode}
								</span>
							</div>
							
							<div class="text-sm text-gray-500 mb-4">
								생성일: {new Date(classroom.createdAt.toDate()).toLocaleDateString()}
							</div>

							<div class="flex gap-2">
								<button 
									on:click={() => enterClass(classroom.id)}
									class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
								>
									클래스 입장
								</button>
								<button 
									on:click={() => navigator.clipboard.writeText(classroom.joinCode)}
									class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-2 px-3 rounded transition-colors"
									title="참여 코드 복사"
								>
									📋
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>