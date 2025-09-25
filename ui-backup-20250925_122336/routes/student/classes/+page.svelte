<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, db } from '$lib/firebase/firebase';
	import { signOut, onAuthStateChanged } from 'firebase/auth';
	import { 
		collection, query, where, getDocs, doc, getDoc, orderBy
	} from 'firebase/firestore';

	let user: any = null;
	let memberClasses: any[] = [];
	let classLessons: {[key: string]: any[]} = {};
	let isLoading = true;
	let error = '';

	onMount(() => {
		// 사용자 인증 상태 확인
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			if (currentUser) {
				user = currentUser;
				
				// 사용자 role 확인
				const userRef = doc(db, `users/${currentUser.uid}`);
				const userDoc = await getDoc(userRef);
				
				if (!userDoc.exists() || userDoc.data()?.role !== 'student') {
					// 학생이 아니면 홈으로 리다이렉션
					goto('/');
					return;
				}
				
				await loadStudentClasses();
			} else {
				goto('/');
			}
			isLoading = false;
		});

		return unsubscribe;
	});

	async function loadStudentClasses() {
		try {
			// 사용자가 참여한 클래스 멤버십 조회
			const membersRef = collection(db, 'classMembers');
			const memberQuery = query(
				membersRef, 
				where('userId', '==', user.uid),
				where('userRole', '==', 'student')
			);
			
			const memberSnapshot = await getDocs(memberQuery);
			
			// 각 멤버십에 대해 클래스 정보 가져오기
			const classPromises = memberSnapshot.docs.map(async (memberDoc) => {
				const memberData = memberDoc.data();
				const classRef = doc(db, 'classrooms', memberData.classId);
				const classDoc = await getDoc(classRef);
				
				if (classDoc.exists()) {
					return {
						...classDoc.data(),
						id: classDoc.id,
						membershipData: memberData
					};
				}
				return null;
			});

			const classResults = await Promise.all(classPromises);
			memberClasses = classResults.filter(cls => cls !== null);
			
			// 각 클래스의 레슨 로드
			for (const classItem of memberClasses) {
				await loadClassLessons(classItem.id);
			}
			
		} catch (err) {
			console.error('클래스 목록 로드 오류:', err);
			error = '클래스 목록을 불러오는 중 오류가 발생했습니다.';
		}
	}

	async function loadClassLessons(classId: string) {
		try {
			const lessonsRef = collection(db, 'lessons');
			const lessonsQuery = query(
				lessonsRef,
				where('classId', '==', classId),
				orderBy('createdAt', 'desc')
			);
			
			const lessonsSnapshot = await getDocs(lessonsQuery);
			classLessons[classId] = lessonsSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (err) {
			console.error(`클래스 ${classId} 레슨 로드 오류:`, err);
			classLessons[classId] = [];
		}
	}

	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/');
		} catch (error) {
			console.error('로그아웃 오류:', error);
		}
	}

	function formatDate(timestamp: any) {
		if (!timestamp) return '';
		return new Date(timestamp.toDate()).toLocaleDateString('ko-KR');
	}

	function goToPortfolio() {
		if (user) {
			goto(`/student/portfolio/${user.uid}`);
		}
	}

	function enterClass(classId: string) {
		// TODO: 클래스 내 수업 목록 페이지로 이동 (현재는 기존 student 페이지로)
		goto(`/student/${classId}`);
	}

	function goToLesson(lessonId: string) {
		goto(`/lessons/${lessonId}`);
	}

	function formatLessonStatus(status: string) {
		switch(status) {
			case 'draft': return { text: '준비중', color: 'gray' };
			case 'active': return { text: '진행중', color: 'green' };
			case 'completed': return { text: '완료', color: 'blue' };
			default: return { text: '알 수 없음', color: 'gray' };
		}
	}
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
	<title>내 클래스 - 상상력을 펼치는 글쓰기</title>
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
		<div class="text-center">
			<div class="text-6xl mb-4">⚠️</div>
			<p class="text-red-600 text-lg mb-4">{error}</p>
			<button 
				on:click={() => window.location.reload()}
				class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
			>
				다시 시도
			</button>
		</div>
	</div>
{:else}
	<main class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="max-w-6xl mx-auto space-y-6">
			<!-- 헤더 -->
			<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							{user?.displayName}님의 클래스
						</h1>
						<p class="text-gray-600 mt-2">참여 중인 클래스에서 수업에 참여하세요</p>
					</div>
					<div class="flex gap-3">
						<button 
							on:click={goToPortfolio}
							class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
						>
							<span>👤</span>
							<span>포트폴리오</span>
						</button>
						<button 
							on:click={handleLogout}
							class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
						>
							로그아웃
						</button>
					</div>
				</div>
			</div>

			<!-- 통계 카드 -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">📚</div>
					<div class="text-2xl font-bold text-blue-600">{memberClasses.length}</div>
					<div class="text-sm text-gray-600">참여 클래스</div>
				</div>
				
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">💭</div>
					<div class="text-2xl font-bold text-green-600">
						{memberClasses.reduce((sum, cls) => sum + (cls.membershipData?.totalWords || 0), 0)}
					</div>
					<div class="text-sm text-gray-600">작성한 낱말</div>
				</div>
				
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">✏️</div>
					<div class="text-2xl font-bold text-orange-600">
						{memberClasses.reduce((sum, cls) => sum + (cls.membershipData?.totalSentences || 0), 0)}
					</div>
					<div class="text-sm text-gray-600">작성한 문장</div>
				</div>
				
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">❤️</div>
					<div class="text-2xl font-bold text-red-600">
						{memberClasses.reduce((sum, cls) => sum + (cls.membershipData?.totalLikes || 0), 0)}
					</div>
					<div class="text-sm text-gray-600">받은 좋아요</div>
				</div>
			</div>

			<!-- 클래스 목록 -->
			<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">📖 참여 중인 클래스</h2>
				
				{#if memberClasses.length === 0}
					<div class="text-center py-12">
						<div class="text-6xl mb-4">🎓</div>
						<h3 class="text-xl font-bold text-gray-700 mb-2">참여 중인 클래스가 없습니다</h3>
						<p class="text-gray-500 mb-6">선생님이 제공한 QR 코드를 스캔하거나 참여 코드를 입력하여 클래스에 참여하세요</p>
						
						<div class="flex justify-center gap-4">
							<a 
								href="/scan" 
								class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
							>
								<span>📱</span>
								<span>QR 코드 스캔</span>
							</a>
							<a 
								href="/" 
								class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
							>
								참여 코드 입력
							</a>
						</div>
					</div>
				{:else}
					<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{#each memberClasses as classItem}
							<div class="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
								<div class="flex items-start justify-between mb-4">
									<div>
										<h3 class="text-lg font-bold text-gray-800 mb-2">{classItem.className}</h3>
										<p class="text-sm text-gray-600">👨‍🏫 {classItem.teacherName}</p>
									</div>
									<div class="text-right">
										<div class="text-xs text-gray-500">참여일</div>
										<div class="text-sm font-medium">
											{formatDate(classItem.membershipData?.joinedAt)}
										</div>
									</div>
								</div>

								<!-- 개인 활동 통계 -->
								<div class="bg-blue-50 rounded-lg p-3 mb-4">
									<h4 class="text-sm font-semibold text-blue-800 mb-2">내 활동 현황</h4>
									<div class="grid grid-cols-3 gap-2 text-xs">
										<div class="text-center">
											<div class="font-bold text-blue-600">{classItem.membershipData?.totalWords || 0}</div>
											<div class="text-blue-500">낱말</div>
										</div>
										<div class="text-center">
											<div class="font-bold text-green-600">{classItem.membershipData?.totalSentences || 0}</div>
											<div class="text-green-500">문장</div>
										</div>
										<div class="text-center">
											<div class="font-bold text-red-600">{classItem.membershipData?.totalLikes || 0}</div>
											<div class="text-red-500">좋아요</div>
										</div>
									</div>
								</div>

								<!-- 레슨 리스트 -->
								{#if classLessons[classItem.id] && classLessons[classItem.id].length > 0}
									<div class="bg-purple-50 rounded-lg p-3 mb-4">
										<h4 class="text-sm font-semibold text-purple-800 mb-2">📚 레슨 ({classLessons[classItem.id].length}개)</h4>
										<div class="space-y-2 max-h-32 overflow-y-auto">
											{#each classLessons[classItem.id].slice(0, 3) as lesson}
												<div class="flex items-center justify-between p-2 bg-white rounded text-xs">
													<div class="flex-1 mr-2">
														<div class="font-medium text-gray-800 truncate">{lesson.title}</div>
														<div class="text-xs text-gray-500">
															{lesson.type === 'creative_writing' ? '📝 창의글쓰기' : 
															 lesson.type === 'vocabulary_game' ? '🎮 단어게임' : '💬 토론'}
														</div>
													</div>
													<div class="flex items-center gap-2">
														<span class="px-2 py-1 rounded-full text-xs {
															formatLessonStatus(lesson.status).color === 'gray' ? 'bg-gray-100 text-gray-600' :
															formatLessonStatus(lesson.status).color === 'green' ? 'bg-green-100 text-green-600' :
															'bg-blue-100 text-blue-600'
														}">
															{formatLessonStatus(lesson.status).text}
														</span>
														{#if lesson.status === 'active'}
															<button 
																on:click={() => goToLesson(lesson.id)}
																class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
															>
																참여
															</button>
														{:else}
															<button 
																on:click={() => goToLesson(lesson.id)}
																class="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
															>
																보기
															</button>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									</div>
								{:else}
									<div class="bg-gray-50 rounded-lg p-3 mb-4 text-center">
										<div class="text-xs text-gray-500">아직 레슨이 없습니다</div>
									</div>
								{/if}

								<div class="flex gap-2">
									<button 
										on:click={() => enterClass(classItem.id)}
										class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"
									>
										수업 참여
									</button>
									<a 
										href="/student/portfolio/{user.uid}?classId={classItem.id}"
										class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm text-center"
									>
										📊
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- 최근 활동 -->
			{#if memberClasses.length > 0}
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">🕒 최근 활동</h2>
					<div class="space-y-3">
						{#each memberClasses.slice(0, 3) as classItem}
							<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
								<div class="flex items-center gap-3">
									<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
									<div>
										<div class="font-medium text-gray-800">{classItem.className}</div>
										<div class="text-sm text-gray-500">
											마지막 활동: {formatDate(classItem.membershipData?.lastActiveAt)}
										</div>
									</div>
								</div>
								<button 
									on:click={() => enterClass(classItem.id)}
									class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
								>
									참여
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</main>
{/if}

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>