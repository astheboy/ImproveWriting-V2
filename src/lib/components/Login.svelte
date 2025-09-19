<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
	import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';

	let joinCode = '';
	let isLoading = false;
	let errorMessage = '';

	// Google 로그인 처리
	async function handleGoogleLogin() {
		try {
			isLoading = true;
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			
			// 교사 정보 저장
			await setDoc(doc(db, 'users', result.user.uid), {
				uid: result.user.uid,
				email: result.user.email,
				displayName: result.user.displayName,
				photoURL: result.user.photoURL,
				lastLogin: new Date()
			}, { merge: true });

			// 대시보드로 이동
			window.location.href = '/dashboard';
		} catch (error) {
			console.error('Google login error:', error);
			errorMessage = '로그인에 실패했습니다. 다시 시도해주세요.';
		} finally {
			isLoading = false;
		}
	}

	// 학생 참여 처리
	async function handleStudentJoin(event: Event) {
		event.preventDefault();
		
		if (!joinCode.trim()) {
			errorMessage = '참여 코드를 입력해주세요.';
			return;
		}

		try {
			isLoading = true;
			
			// 클래스 존재 확인
			const classroomsRef = collection(db, 'classrooms');
			const q = query(classroomsRef, where('joinCode', '==', joinCode.toUpperCase()));
			const querySnapshot = await getDocs(q);
			
			if (querySnapshot.empty) {
				errorMessage = '존재하지 않는 참여 코드입니다.';
				return;
			}

			// 익명 로그인
			const userCredential = await signInAnonymously(auth);
			const classDoc = querySnapshot.docs[0];
			
			// 학생 참여 화면으로 이동
			window.location.href = `/student/${classDoc.id}`;
		} catch (error) {
			console.error('Student join error:', error);
			errorMessage = '참여에 실패했습니다. 다시 시도해주세요.';
		} finally {
			isLoading = false;
		}
	}

	// 에러 메시지 자동 숨김
	$: if (errorMessage) {
		setTimeout(() => errorMessage = '', 3000);
	}
</script>

<svelte:head>
	<title>상상력을 펼치는 글쓰기</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="bg-gray-100 flex items-center justify-center min-h-screen p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-8">
		<!-- 헤더 -->
		<div>
			<h1 class="text-center text-4xl font-bold text-gray-800">상상력을 펼치며 글쓰기</h1>
			<p class="text-center text-gray-500 mt-2">창의적인 글쓰기, 친구들과 함께해요!</p>
		</div>

		<!-- 에러 메시지 -->
		{#if errorMessage}
			<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
				{errorMessage}
			</div>
		{/if}

		<!-- 학생 참여 섹션 -->
		<div class="space-y-4">
			<h2 class="text-xl font-bold text-center text-gray-700">학생으로 참여하기</h2>
			<form on:submit={handleStudentJoin}>
				<input 
					type="text" 
					bind:value={joinCode}
					maxlength="6"
					placeholder="참여 코드"
					disabled={isLoading}
					class="w-full p-4 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-indigo-300 transition uppercase"
				/>
				<button 
					type="submit"
					disabled={isLoading}
					class="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors shadow-lg"
				>
					{#if isLoading}
						<div class="flex items-center justify-center">
							<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
							<span class="ml-2">참여 중...</span>
						</div>
					{:else}
						수업 참여하기
					{/if}
				</button>
			</form>
		</div>

		<!-- 구분선 -->
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<div class="w-full border-t border-gray-300"></div>
			</div>
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-white text-gray-500">또는</span>
			</div>
		</div>

		<!-- 교사 로그인 섹션 -->
		<div class="space-y-2 text-center">
			<h2 class="text-xl font-bold text-gray-700">선생님이신가요?</h2>
			<button 
				on:click={handleGoogleLogin}
				disabled={isLoading}
				class="inline-flex items-center gap-3 bg-white py-2 px-6 border border-gray-300 rounded-full shadow-sm hover:shadow-lg disabled:opacity-50 transition-shadow"
			>
				<svg class="w-6 h-6" viewBox="0 0 48 48">
					<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
					<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 2.84-2.3 5.44-4.92 7.18l7.98 6.19C45.27 38.91 48 32.16 48 24c0-.73-.04-1.45-.11-2.16l-1.01.71z"></path>
					<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
					<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.11 1.45-4.82 2.3-7.91 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
					<path fill="none" d="M0 0h48v48H0z"></path>
				</svg>
				<span class="font-semibold text-gray-700">Google 계정으로 로그인</span>
			</button>
		</div>
	</div>
</main>

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>