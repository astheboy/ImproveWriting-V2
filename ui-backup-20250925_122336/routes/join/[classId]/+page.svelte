<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth, db } from '$lib/firebase/firebase';
	import { 
		doc, getDoc, setDoc, updateDoc, increment
	} from 'firebase/firestore';
	import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';

	let user: any = null;
	let classData: any = null;
	let isLoading = true;
	let isJoining = false;
	let error = '';
	let loginError = '';

	// URL에서 classId 가져오기
	$: classId = $page.params.classId;

	onMount(() => {
		// 사용자 인증 상태 확인
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			if (currentUser) {
				user = currentUser;
				
				// 이미 로그인된 경우 클래스 정보 로드 후 바로 참여 처리
				await loadClassData();
				if (classData && !error) {
					await joinClass();
				}
			} else {
				// 로그인되지 않은 경우 클래스 정보만 로드
				await loadClassData();
			}
			isLoading = false;
		});

		return unsubscribe;
	});

	async function loadClassData() {
		try {
			console.log('Loading class data for ID:', classId);
			
			const classRef = doc(db, 'classrooms', classId);
			const classDoc = await getDoc(classRef);
			
			console.log('Class document exists:', classDoc.exists());
			
			if (!classDoc.exists()) {
				console.error('Class document not found for ID:', classId);
				error = '존재하지 않는 클래스입니다.';
				return;
			}

			classData = { id: classDoc.id, ...classDoc.data() };

			// 참여가 허용되지 않는 클래스인지 확인
			if (!classData.allowJoin) {
				error = '현재 참여가 제한된 클래스입니다.';
				return;
			}

			// 최대 인원 초과 확인
			if (classData.studentCount >= classData.maxStudents) {
				error = '클래스 정원이 마감되었습니다.';
				return;
			}

		} catch (err) {
			console.error('클래스 정보 로드 오류:', err);
			error = '클래스 정보를 불러오는 중 오류가 발생했습니다.';
		}
	}

	async function loginWithGoogle() {
		try {
			isJoining = true;
			loginError = '';
			
			const provider = new GoogleAuthProvider();
			const credential = await signInWithPopup(auth, provider);
			
			user = credential.user;
			
			// 로그인 성공 후 자동으로 클래스 참여 처리
			await joinClass();
			
		} catch (err) {
			console.error('Google 로그인 오류:', err);
			loginError = 'Google 로그인 중 문제가 발생했습니다. 다시 시도해주세요.';
			isJoining = false;
		}
	}

	async function joinClass() {
		if (!user || !classData) return;

		try {
			isJoining = true;

			// 1. 사용자 정보 업데이트 (role을 student로 설정)
			const userRef = doc(db, `users/${user.uid}`);
			const userDoc = await getDoc(userRef);

			if (!userDoc.exists()) {
				// 신규 사용자 생성
				await setDoc(userRef, {
					uid: user.uid,
					email: user.email,
					displayName: user.displayName,
					photoURL: user.photoURL || '',
					role: 'student',
					points: 0,
					level: 1,
					badges: [],
					createdAt: new Date(),
					updatedAt: new Date()
				});
			} else {
				// 기존 사용자 정보 업데이트
				await updateDoc(userRef, {
					role: 'student',
					updatedAt: new Date()
				});
			}

			// 2. 클래스 멤버십 생성
			const membershipId = `${classId}_${user.uid}`;
			const memberRef = doc(db, `classMembers/${membershipId}`);
			const memberDoc = await getDoc(memberRef);

			if (!memberDoc.exists()) {
				// 새로운 멤버 추가
				await setDoc(memberRef, {
					classId: classId,
					userId: user.uid,
					userRole: 'student',
					displayName: user.displayName || user.email,
					email: user.email,
					photoURL: user.photoURL || '',
					joinedAt: new Date(),
					lastActiveAt: new Date(),
					totalActivities: 0,
					totalWords: 0,
					totalSentences: 0,
					totalLikes: 0
				});

				// 3. 클래스의 학생 수 증가
				const classRef = doc(db, 'classrooms', classId);
				await updateDoc(classRef, {
					studentCount: increment(1)
				});

				console.log('클래스 참여 완료');
			} else {
				console.log('이미 참여 중인 클래스입니다');
			}

			// 4. 학생 대시보드로 리다이렉션
			goto('/student/classes');

		} catch (err) {
			console.error('클래스 참여 오류:', err);
			error = '클래스 참여 중 오류가 발생했습니다. 다시 시도해주세요.';
			isJoining = false;
		}
	}
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
	<title>클래스 참여 - 상상력을 펼치는 글쓰기</title>
</svelte:head>

{#if isLoading}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="text-center">
			<div class="text-6xl mb-4">📚</div>
			<p class="text-gray-600 text-lg">클래스 정보를 불러오는 중입니다...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="text-center max-w-md">
			<div class="text-6xl mb-4">⚠️</div>
			<h1 class="text-2xl font-bold text-red-600 mb-4">참여할 수 없습니다</h1>
			<p class="text-red-500 mb-6">{error}</p>
			<a 
				href="/" 
				class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
			>
				홈으로 돌아가기
			</a>
		</div>
	</div>
{:else if classData}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
			<div class="text-center mb-8">
				<div class="text-6xl mb-4">🎓</div>
				<h1 class="text-2xl font-bold text-gray-800 mb-2">클래스 참여</h1>
				<div class="bg-blue-50 rounded-2xl p-4 mb-4">
					<h2 class="text-xl font-bold text-blue-800">{classData.className}</h2>
					<p class="text-blue-600 text-sm mt-1">담당: {classData.teacherName}</p>
				</div>
				<p class="text-gray-600">Google 계정으로 로그인하여 클래스에 참여하세요</p>
			</div>

			{#if !user}
				<div class="space-y-4">
					<button 
						on:click={loginWithGoogle}
						disabled={isJoining}
						class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
					>
						{#if isJoining}
							<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
							<span>참여 중...</span>
						{:else}
							<span class="text-xl">🔐</span>
							<span>Google 계정으로 참여하기</span>
						{/if}
					</button>

					<div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
						<h3 class="font-semibold text-yellow-800 mb-2">✨ Google 로그인의 장점</h3>
						<ul class="text-sm text-yellow-700 space-y-1">
							<li>• 개인 학습 포트폴리오 관리</li>
							<li>• 활동 기록 자동 저장</li>
							<li>• 포인트 및 레벨 시스템</li>
							<li>• 모든 클래스 통합 관리</li>
						</ul>
					</div>

					{#if loginError}
						<div class="bg-red-50 border border-red-200 rounded-xl p-4">
							<p class="text-red-600 text-sm text-center">{loginError}</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="text-center">
					<div class="bg-green-50 border border-green-200 rounded-xl p-6 mb-4">
						<div class="text-4xl mb-2">✅</div>
						<h3 class="text-lg font-semibold text-green-800 mb-2">참여 준비 완료!</h3>
						<p class="text-green-600 text-sm">
							{user.displayName}님, 잠시만 기다려주세요.<br/>
							클래스에 참여 처리 중입니다...
						</p>
					</div>
					
					{#if isJoining}
						<div class="flex items-center justify-center gap-2 text-blue-600">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
							<span class="text-sm">참여 처리 중...</span>
						</div>
					{/if}
				</div>
			{/if}

			<div class="mt-8 pt-6 border-t border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-500 mb-2">클래스 정보</p>
					<div class="grid grid-cols-2 gap-4 text-xs text-gray-600">
						<div>
							<span class="font-medium">현재 참여자</span><br>
							<span class="text-blue-600">{classData.studentCount || 0}명</span>
						</div>
						<div>
							<span class="font-medium">최대 인원</span><br>
							<span class="text-gray-500">{classData.maxStudents}명</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>