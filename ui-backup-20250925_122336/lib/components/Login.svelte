<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
	import { collection, doc, setDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

	let joinCode = '';
	let isLoading = false;
	let errorMessage = '';
	let loginError = '';
	let selectedRole = ''; // 'teacher' 또는 'student'
	let showRoleSelection = true;
	let showJoinCodeInput = false; // 참여 코드 입력 화면 표시 여부

	// Google 로그인 처리 (교사용)
	async function handleGoogleLogin() {
		try {
			isLoading = true;
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			
			// 교사 정보 저장 (역할 포함)
			await setDoc(doc(db, 'users', result.user.uid), {
				uid: result.user.uid,
				email: result.user.email,
				displayName: result.user.displayName,
				photoURL: result.user.photoURL,
				role: 'teacher', // 교사 역할 명시
				points: 0,
				level: 1,
				createdAt: serverTimestamp(),
				lastLogin: serverTimestamp()
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

	// 학생 Google 로그인 처리
	async function handleStudentGoogleLogin() {
		try {
			isLoading = true;
			loginError = '';
			
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			
			// 학생이 이미 클래스에 참여했는지 확인
			const membershipQuery = query(
				collection(db, 'classMembers'), 
				where('userId', '==', result.user.uid)
			);
			const membershipSnapshot = await getDocs(membershipQuery);
			
			if (!membershipSnapshot.empty) {
				// 이미 클래스에 참여한 학생 - 역할 설정 후 학생 페이지로 이동
				await setDoc(doc(db, 'users', result.user.uid), {
					uid: result.user.uid,
					email: result.user.email,
					displayName: result.user.displayName,
					photoURL: result.user.photoURL,
					role: 'student', // 학생 역할 명시
					points: 0,
					level: 1,
					lastLogin: serverTimestamp()
				}, { merge: true });
				
				window.location.href = '/student/classes';
			} else {
				// 아직 클래스에 참여하지 않은 학생 - 참여 코드 입력 요청
				showJoinCodeInput = true;
				errorMessage = '아직 참여한 클래스가 없습니다. 선생님이 준 참여 코드를 입력해주세요.';
			}
			
		} catch (error) {
			console.error('Student Google login error:', error);
			errorMessage = '로그인에 실패했습니다. 다시 시도해주세요.';
		} finally {
			isLoading = false;
		}
	}

	// 참여 코드로 클래스 참여 처리
	async function handleJoinWithCode(event: Event) {
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

			const classDoc = querySnapshot.docs[0];
			
			// join 페이지로 이동 (이미 로그인된 상태이므로 자동 참여 처리됨)
			window.location.href = `/join/${classDoc.id}`;
		} catch (error) {
			console.error('Join with code error:', error);
			errorMessage = '참여에 실패했습니다. 다시 시도해주세요.';
		} finally {
			isLoading = false;
		}
	}

	// 역할 선택 처리
	function selectRole(role: string) {
		selectedRole = role;
		showRoleSelection = false;
		errorMessage = ''; // 에러 메시지 초기화
	}

	// 뒤로가기
	function goBack() {
		showRoleSelection = true;
		selectedRole = '';
		joinCode = '';
		errorMessage = '';
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

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="w-full max-w-md">

		{#if showRoleSelection}
			<!-- 역할 선택 화면 -->
			<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-8">
				<!-- 헤더 -->
				<div class="text-center">
					<div class="text-6xl mb-4">🎆</div>
					<h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
						상상력을 펼치며 글쓰기
					</h1>
					<p class="text-gray-600 text-lg">창의적인 글쓰기, 친구들과 함께해요!</p>
				</div>

				<!-- 역할 선택 버튼 -->
				<div class="space-y-4">
					<h2 class="text-xl font-bold text-center text-gray-700 mb-6">어떻게 사용하실가요?</h2>
					
					<!-- 학생 선택 -->
					<button 
						on:click={() => selectRole('student')}
						class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-6 rounded-2xl shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl"
					>
						<div class="flex items-center justify-center space-x-3">
							<span class="text-3xl">🎓</span>
							<div class="text-left">
								<div class="text-xl font-bold">학생으로 참여하기</div>
								<div class="text-sm opacity-90">선생님이 준 참여 코드를 입력하세요</div>
							</div>
						</div>
					</button>

					<!-- 교사 선택 -->
					<button 
						on:click={() => selectRole('teacher')}
						class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 rounded-2xl shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl"
					>
						<div class="flex items-center justify-center space-x-3">
							<span class="text-3xl">🎑</span>
							<div class="text-left">
								<div class="text-xl font-bold">선생님 로그인</div>
								<div class="text-sm opacity-90">Google 계정으로 수업을 관리하세요</div>
							</div>
						</div>
					</button>
				</div>
			</div>

		{:else if selectedRole === 'student'}
			{#if !showJoinCodeInput}
				<!-- 학생 Google 로그인 화면 -->
				<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-6">
					<!-- 헤더 -->
					<div class="text-center">
						<div class="text-5xl mb-4">🎓</div>
						<h2 class="text-2xl font-bold text-gray-800 mb-2">학생 로그인</h2>
						<p class="text-gray-600">Google 계정으로 로그인하여 수업에 참여하세요</p>
					</div>

					<!-- 에러 메시지 -->
					{#if errorMessage}
						<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
							{errorMessage}
						</div>
					{/if}

					<!-- Google 로그인 버튼 -->
					<div class="space-y-4">
						<button 
							on:click={handleStudentGoogleLogin}
							disabled={isLoading}
							class="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 py-4 px-6 rounded-2xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:transform-none disabled:shadow-lg"
						>
							{#if isLoading}
								<div class="flex items-center justify-center">
									<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
									<span class="ml-3 text-lg text-gray-600">로그인 중...</span>
								</div>
							{:else}
								<div class="flex items-center justify-center space-x-3">
									<svg class="w-6 h-6" viewBox="0 0 48 48">
										<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
										<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 2.84-2.3 5.44-4.92 7.18l7.98 6.19C45.27 38.91 48 32.16 48 24c0-.73-.04-1.45-.11-2.16l-1.01.71z"></path>
										<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
										<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.11 1.45-4.82 2.3-7.91 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
										<path fill="none" d="M0 0h48v48H0z"></path>
									</svg>
									<span class="font-bold text-gray-700 text-lg">Google 계정으로 로그인</span>
								</div>
							{/if}
						</button>

						<div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
							<h3 class="font-semibold text-blue-800 mb-2">✨ 로그인 후 자동으로...</h3>
							<ul class="text-sm text-blue-700 space-y-1">
								<li>• 이미 참여한 클래스가 있다면 학생 페이지로 이동</li>
								<li>• 처음이라면 참여 코드 입력 요청</li>
							</ul>
						</div>
					</div>

					<!-- 뒤로가기 -->
					<button 
						on:click={goBack}
						class="w-full text-gray-500 hover:text-gray-700 py-2 transition-colors"
					>
						← 뒤로가기
					</button>
				</div>
			{:else}
				<!-- 참여 코드 입력 화면 -->
				<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-6">
					<!-- 헤더 -->
					<div class="text-center">
						<div class="text-5xl mb-4">🎩</div>
						<h2 class="text-2xl font-bold text-gray-800 mb-2">클래스 참여</h2>
						<p class="text-gray-600">선생님이 준 6자리 참여 코드를 입력하세요</p>
					</div>

					<!-- 에러 메시지 -->
					{#if errorMessage}
						<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
							{errorMessage}
						</div>
					{/if}

					<!-- 참여 코드 입력 -->
					<form on:submit={handleJoinWithCode} class="space-y-4">
						<input 
							type="text" 
							bind:value={joinCode}
							maxlength="6"
							placeholder="ABC123"
							disabled={isLoading}
							class="w-full p-4 text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-green-300 focus:border-green-500 transition uppercase bg-gray-50"
						/>
						<button 
							type="submit"
							disabled={isLoading || !joinCode.trim()}
							class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-105 shadow-xl disabled:transform-none disabled:shadow-lg"
						>
							{#if isLoading}
								<div class="flex items-center justify-center">
									<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
									<span class="ml-3 text-lg">참여 중...</span>
								</div>
							{:else}
								<span class="text-lg">🚀 클래스 참여하기</span>
							{/if}
						</button>
					</form>

					<!-- 뒤로가기 -->
					<button 
						on:click={() => { showJoinCodeInput = false; errorMessage = ''; }}
						class="w-full text-gray-500 hover:text-gray-700 py-2 transition-colors"
					>
						← 로그인으로 돌아가기
					</button>
				</div>
			{/if}

		{:else if selectedRole === 'teacher'}
			<!-- 교사 로그인 화면 -->
			<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-6">
				<!-- 헤더 -->
				<div class="text-center">
					<div class="text-5xl mb-4">🎑</div>
					<h2 class="text-2xl font-bold text-gray-800 mb-2">선생님 로그인</h2>
					<p class="text-gray-600">Google 계정으로 로그인하여 수업을 시작하세요</p>
				</div>

				<!-- 에러 메시지 -->
				{#if errorMessage}
					<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
						{errorMessage}
					</div>
				{/if}

				<!-- Google 로그인 버튼 -->
				<div class="space-y-4">
					<button 
						on:click={handleGoogleLogin}
						disabled={isLoading}
						class="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 py-4 px-6 rounded-2xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:transform-none disabled:shadow-lg"
					>
						{#if isLoading}
							<div class="flex items-center justify-center">
								<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
								<span class="ml-3 text-lg text-gray-600">로그인 중...</span>
							</div>
						{:else}
							<div class="flex items-center justify-center space-x-3">
								<svg class="w-6 h-6" viewBox="0 0 48 48">
									<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
									<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 2.84-2.3 5.44-4.92 7.18l7.98 6.19C45.27 38.91 48 32.16 48 24c0-.73-.04-1.45-.11-2.16l-1.01.71z"></path>
									<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
									<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.11 1.45-4.82 2.3-7.91 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
									<path fill="none" d="M0 0h48v48H0z"></path>
								</svg>
								<span class="font-bold text-gray-700 text-lg">Google 계정으로 로그인</span>
							</div>
						{/if}
					</button>

					<div class="text-center text-sm text-gray-500">
						교사 계정만 사용 가능하며, 본인 인증이 필요합니다.
					</div>
				</div>

				<!-- 뒤로가기 -->
				<button 
					on:click={goBack}
					class="w-full text-gray-500 hover:text-gray-700 py-2 transition-colors"
				>
					← 뒤로가기
				</button>
			</div>
		{/if}
	</div>
</main>

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>