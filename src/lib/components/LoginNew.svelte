<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import RoleSelection from './auth/RoleSelection.svelte';
	import TeacherLogin from './auth/TeacherLogin.svelte';
	import StudentLogin from './auth/StudentLogin.svelte';
	import JoinCodeInput from './auth/JoinCodeInput.svelte';
	import type { User } from '$lib/types';

	// 현재 화면 상태
	type ViewState = 'role-selection' | 'teacher-login' | 'student-login' | 'join-code';
	let currentView: ViewState = 'role-selection';
	let errorMessage = '';

	// 역할 선택 핸들러
	function handleRoleSelection(event: CustomEvent<{ role: 'teacher' | 'student' }>) {
		const { role } = event.detail;
		if (role === 'teacher') {
			currentView = 'teacher-login';
		} else {
			currentView = 'student-login';
		}
		errorMessage = '';
	}

	// 교사 로그인 성공
	function handleTeacherLoginSuccess(event: CustomEvent<{ user: User }>) {
		if (browser) {
			goto('/dashboard');
		}
	}

	// 학생 로그인 성공
	function handleStudentLoginSuccess(event: CustomEvent<{ user: User }>) {
		if (browser) {
			goto('/student/classes');
		}
	}

	// 학생 참여 코드 입력 화면 표시
	function handleShowJoinCode() {
		currentView = 'join-code';
		errorMessage = '아직 참여한 클래스가 없습니다. 선생님이 준 참여 코드를 입력해주세요.';
	}

	// 클래스 참여 성공
	function handleJoinSuccess(event: CustomEvent<{ classId: string }>) {
		const { classId } = event.detail;
		if (browser) {
			goto(`/join/${classId}`);
		}
	}

	// 로그인/참여 에러 처리
	function handleError(event: CustomEvent<{ error: string }>) {
		errorMessage = event.detail.error;
	}

	// 뒤로가기 처리
	function handleBack() {
		if (currentView === 'teacher-login' || currentView === 'student-login') {
			currentView = 'role-selection';
		} else if (currentView === 'join-code') {
			currentView = 'student-login';
		}
		errorMessage = '';
	}

	// 에러 메시지 자동 숨김
	$: if (errorMessage) {
		const timer = setTimeout(() => errorMessage = '', 5000);
		// cleanup을 위한 타이머 저장 (실제로는 컴포넌트 unmount시 정리됨)
	}
</script>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="w-full max-w-md">
		<!-- 에러 메시지 표시 -->
		{#if errorMessage}
			<div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
				{errorMessage}
			</div>
		{/if}

		<!-- 역할 선택 화면 -->
		{#if currentView === 'role-selection'}
			<RoleSelection on:roleSelected={handleRoleSelection} />
		
		<!-- 교사 로그인 화면 -->
		{:else if currentView === 'teacher-login'}
			<TeacherLogin 
				on:loginSuccess={handleTeacherLoginSuccess}
				on:loginError={handleError}
				on:back={handleBack}
			/>
		
		<!-- 학생 로그인 화면 -->
		{:else if currentView === 'student-login'}
			<StudentLogin 
				on:loginSuccess={handleStudentLoginSuccess}
				on:loginError={handleError}
				on:showJoinCode={handleShowJoinCode}
				on:back={handleBack}
			/>
		
		<!-- 참여 코드 입력 화면 -->
		{:else if currentView === 'join-code'}
			<JoinCodeInput 
				on:joinSuccess={handleJoinSuccess}
				on:joinError={handleError}
				on:back={handleBack}
			/>
		{/if}
	</div>
</main>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
	<title>상상력을 펼치는 글쓰기</title>
</svelte:head>