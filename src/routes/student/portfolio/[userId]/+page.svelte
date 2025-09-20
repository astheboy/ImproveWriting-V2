<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { auth, db } from '$lib/firebase/firebase';
	import { 
		doc, getDoc, collection, query, where, getDocs, orderBy, limit
	} from 'firebase/firestore';
	import { onAuthStateChanged } from 'firebase/auth';

	let user: any = null;
	let isLoading = true;
	let portfolioData: any = null;
	let userStats = {
		totalActivities: 0,
		totalWords: 0,
		totalSentences: 0,
		totalLikes: 0,
		points: 0,
		level: 1,
		badges: []
	};
	let recentActivities: any[] = [];
	let achievements: any[] = [];

	// URL 파라미터에서 userId 가져오기
	$: userId = $page.params.userId;

	onMount(() => {
		// 사용자 인증 상태 확인
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			if (currentUser) {
				user = currentUser;
				
				// 자신의 포트폴리오만 볼 수 있도록 제한
				if (currentUser.uid === userId) {
					loadPortfolioData();
				} else {
					// 권한 없음 에러 처리
					console.error('권한이 없습니다.');
					portfolioData = { error: '권한이 없습니다.' };
					isLoading = false;
				}
			} else {
				// 로그인하지 않은 경우 로그인 페이지로 리다이렉트
				window.location.href = '/';
			}
		});

		return unsubscribe;
	});

	async function loadPortfolioData() {
		try {
			isLoading = true;
			
			// 1. 사용자 기본 정보 로드
			const userRef = doc(db, `users/${userId}`);
			const userDoc = await getDoc(userRef);
			
			if (!userDoc.exists()) {
				portfolioData = { error: '사용자를 찾을 수 없습니다.' };
				isLoading = false;
				return;
			}

			const userData = userDoc.data();
			portfolioData = userData;

			// 2. 사용자 통계 로드
			await loadUserStats();
			
			// 3. 최근 활동 로드
			await loadRecentActivities();
			
			// 4. 성취 배지 로드
			loadAchievements();

			isLoading = false;
		} catch (error) {
			console.error('포트폴리오 로드 중 오류:', error);
			portfolioData = { error: '데이터를 불러오는 중 오류가 발생했습니다.' };
			isLoading = false;
		}
	}

	async function loadUserStats() {
		try {
			// 모든 클래스에서 사용자의 활동 통계 집계
			const classesRef = collection(db, 'classrooms');
			const classesSnapshot = await getDocs(classesRef);
			
			let totalWords = 0;
			let totalSentences = 0;
			let totalLikes = 0;
			let totalActivities = 0;

			for (const classDoc of classesSnapshot.docs) {
				const classId = classDoc.id;
				
				// 낱말 통계
				const wordsQuery = query(
					collection(db, `classrooms/${classId}/words`),
					where('authorId', '==', userId)
				);
				const wordsSnapshot = await getDocs(wordsQuery);
				totalWords += wordsSnapshot.size;

				// 문장 통계
				const sentencesQuery = query(
					collection(db, `classrooms/${classId}/sentences`),
					where('authorId', '==', userId)
				);
				const sentencesSnapshot = await getDocs(sentencesQuery);
				totalSentences += sentencesSnapshot.size;

				// 받은 좋아요 수 계산
				sentencesSnapshot.forEach((doc) => {
					const data = doc.data();
					totalLikes += (data.likesBy?.length || 0);
				});

				// 활동 참여 클래스 수
				if (wordsSnapshot.size > 0 || sentencesSnapshot.size > 0) {
					totalActivities++;
				}
			}

			userStats = {
				totalActivities,
				totalWords,
				totalSentences,
				totalLikes,
				points: portfolioData.points || 0,
				level: portfolioData.level || 1,
				badges: portfolioData.badges || []
			};
		} catch (error) {
			console.error('사용자 통계 로드 중 오류:', error);
		}
	}

	async function loadRecentActivities() {
		try {
			const activities: any[] = [];
			const classesRef = collection(db, 'classrooms');
			const classesSnapshot = await getDocs(classesRef);

			for (const classDoc of classesSnapshot.docs) {
				const classId = classDoc.id;
				const classData = classDoc.data();
				
				// 최근 문장들
				const sentencesQuery = query(
					collection(db, `classrooms/${classId}/sentences`),
					where('authorId', '==', userId),
					orderBy('createdAt', 'desc'),
					limit(3)
				);
				const sentencesSnapshot = await getDocs(sentencesQuery);
				
				sentencesSnapshot.forEach((doc) => {
					const data = doc.data();
					activities.push({
						type: 'sentence',
						text: data.text,
						className: classData.className,
						classId,
						likes: data.likesBy?.length || 0,
						createdAt: data.createdAt?.toDate() || new Date()
					});
				});
			}

			// 시간순 정렬하여 최근 10개만 표시
			recentActivities = activities
				.sort((a, b) => b.createdAt - a.createdAt)
				.slice(0, 10);
		} catch (error) {
			console.error('최근 활동 로드 중 오류:', error);
		}
	}

	function loadAchievements() {
		// 통계를 바탕으로 성취 배지 계산
		achievements = [];

		// 첫 문장 작성
		if (userStats.totalSentences > 0) {
			achievements.push({
				title: '첫 문장 작성자',
				description: '첫 번째 문장을 작성했습니다!',
				icon: '✏️',
				earnedAt: '최근'
			});
		}

		// 인기 작가
		if (userStats.totalLikes >= 10) {
			achievements.push({
				title: '인기 작가',
				description: '10개 이상의 좋아요를 받았습니다!',
				icon: '❤️',
				earnedAt: '최근'
			});
		}

		// 활발한 참여자
		if (userStats.totalWords >= 20) {
			achievements.push({
				title: '낱말 탐험가',
				description: '20개 이상의 낱말을 작성했습니다!',
				icon: '🔍',
				earnedAt: '최근'
			});
		}

		// 다양한 활동 참여
		if (userStats.totalActivities >= 3) {
			achievements.push({
				title: '열정적 참여자',
				description: '3개 이상의 활동에 참여했습니다!',
				icon: '🎯',
				earnedAt: '최근'
			});
		}
	}

	function formatDate(date: Date) {
		return new Intl.DateTimeFormat('ko-KR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getProgressPercent(points: number) {
		// 레벨별 필요 포인트를 100포인트 단위로 계산
		const currentLevelPoints = (userStats.level - 1) * 100;
		const nextLevelPoints = userStats.level * 100;
		const progressInLevel = points - currentLevelPoints;
		return (progressInLevel / 100) * 100;
	}
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
	<title>{portfolioData?.displayName || '익명'}님의 포트폴리오 - 상상력을 펼치는 글쓰기</title>
</svelte:head>

{#if isLoading}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="text-center">
			<div class="text-6xl mb-4">📊</div>
			<p class="text-gray-600 text-lg">포트폴리오를 불러오는 중입니다...</p>
		</div>
	</div>
{:else if portfolioData?.error}
	<div class="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="text-center">
			<div class="text-6xl mb-4">🚫</div>
			<p class="text-red-600 text-lg">{portfolioData.error}</p>
			<a href="/" class="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
				홈으로 돌아가기
			</a>
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
							{portfolioData.displayName || '익명'}님의 학습 포트폴리오
						</h1>
						<p class="text-gray-600 mt-2">🌟 창의적 글쓰기 여정을 확인해보세요</p>
					</div>
					<div class="text-right">
						<div class="text-sm text-gray-500">가입일</div>
						<div class="font-medium">
							{portfolioData.createdAt ? formatDate(portfolioData.createdAt.toDate()) : '알 수 없음'}
						</div>
					</div>
				</div>
			</div>

			<!-- 통계 대시보드 -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">✨</div>
					<div class="text-2xl font-bold text-yellow-600">{userStats.points}</div>
					<div class="text-sm text-gray-600">총 포인트</div>
				</div>
				
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">🏆</div>
					<div class="text-2xl font-bold text-purple-600">레벨 {userStats.level}</div>
					<div class="text-sm text-gray-600">현재 레벨</div>
				</div>
				
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">📝</div>
					<div class="text-2xl font-bold text-blue-600">{userStats.totalSentences}</div>
					<div class="text-sm text-gray-600">작성한 문장</div>
				</div>
				
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
					<div class="text-3xl mb-2">❤️</div>
					<div class="text-2xl font-bold text-red-600">{userStats.totalLikes}</div>
					<div class="text-sm text-gray-600">받은 좋아요</div>
				</div>
			</div>

			<!-- 레벨 진행도 -->
			<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">🚀 레벨 진행도</h2>
				<div class="flex items-center gap-4">
					<div class="text-sm text-gray-600">레벨 {userStats.level}</div>
					<div class="flex-1 bg-gray-200 rounded-full h-4">
						<div 
							class="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full transition-all duration-500"
							style="width: {getProgressPercent(userStats.points)}%"
						></div>
					</div>
					<div class="text-sm text-gray-600">레벨 {userStats.level + 1}</div>
				</div>
				<div class="mt-2 text-sm text-gray-500">
					다음 레벨까지 {Math.max(0, userStats.level * 100 - userStats.points)}포인트 남았습니다!
				</div>
			</div>

			<div class="grid lg:grid-cols-2 gap-6">
				<!-- 성취 배지 -->
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">🏅 성취 배지</h2>
					{#if achievements.length > 0}
						<div class="space-y-3">
							{#each achievements as achievement}
								<div class="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
									<div class="text-2xl">{achievement.icon}</div>
									<div class="flex-1">
										<div class="font-semibold text-orange-800">{achievement.title}</div>
										<div class="text-sm text-orange-600">{achievement.description}</div>
									</div>
									<div class="text-xs text-gray-500">{achievement.earnedAt}</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center text-gray-500 py-8">
							<div class="text-4xl mb-2">🎯</div>
							<p>아직 획득한 배지가 없습니다.</p>
							<p class="text-sm">더 많은 활동에 참여해서 배지를 획득해보세요!</p>
						</div>
					{/if}
				</div>

				<!-- 최근 활동 -->
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">📚 최근 활동</h2>
					{#if recentActivities.length > 0}
						<div class="max-h-96 overflow-y-auto space-y-3">
							{#each recentActivities as activity}
								<div class="p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
									<div class="flex items-start justify-between mb-2">
										<div class="flex-1">
											<div class="text-sm text-gray-500 mb-1">{activity.className}</div>
											<p class="text-gray-800 leading-relaxed">{activity.text}</p>
										</div>
										<div class="flex items-center gap-1 text-red-500 text-sm">
											<span>❤️</span>
											<span>{activity.likes}</span>
										</div>
									</div>
									<div class="text-xs text-gray-400">
										{formatDate(activity.createdAt)}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center text-gray-500 py-8">
							<div class="text-4xl mb-2">📝</div>
							<p>아직 작성한 활동이 없습니다.</p>
							<p class="text-sm">클래스에 참여해서 창의적인 문장을 작성해보세요!</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- 상세 통계 -->
			<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
				<h2 class="text-xl font-bold text-gray-800 mb-4">📊 상세 통계</h2>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
					<div class="text-center">
						<div class="text-2xl mb-2">🎯</div>
						<div class="text-2xl font-bold text-green-600">{userStats.totalActivities}</div>
						<div class="text-sm text-gray-600">참여한 활동</div>
					</div>
					
					<div class="text-center">
						<div class="text-2xl mb-2">💭</div>
						<div class="text-2xl font-bold text-blue-600">{userStats.totalWords}</div>
						<div class="text-sm text-gray-600">작성한 낱말</div>
					</div>
					
					<div class="text-center">
						<div class="text-2xl mb-2">📖</div>
						<div class="text-2xl font-bold text-indigo-600">{userStats.totalSentences}</div>
						<div class="text-sm text-gray-600">작성한 문장</div>
					</div>
					
					<div class="text-center">
						<div class="text-2xl mb-2">⭐</div>
						<div class="text-2xl font-bold text-pink-600">
							{userStats.totalSentences > 0 ? (userStats.totalLikes / userStats.totalSentences).toFixed(1) : 0}
						</div>
						<div class="text-sm text-gray-600">문장당 평균 좋아요</div>
					</div>
				</div>
			</div>

			<!-- 하단 네비게이션 -->
			<div class="text-center">
				<a href="/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
					홈으로 돌아가기
				</a>
			</div>
		</div>
	</main>
{/if}

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>