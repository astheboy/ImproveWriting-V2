<script lang="ts">
	// import { writable } from 'svelte/store'; // 현재 사용하지 않으므로 제거
	import { serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase/firebase';
	
	export let user: any;
	export let classId: string;
	
	// 고급 포인트 시스템 상태
	let currentStreak = 0; // 연속 활동 일수
	let todayActivities = 0; // 오늘 활동 횟수
	let creativityMultiplier = 1.0; // 창의성 배수
	let teamBonusActive = false; // 팀 보너스 활성화 여부
	
	// 포인트 지급 규칙 개선
	const POINT_RULES = {
		// 기본 활동
		WORD_SUBMIT: 5,
		SENTENCE_SUBMIT: 10,
		LIKE_GIVEN: 3,
		LIKE_RECEIVED: 5,
		
		// 창의성 보너스 (단어 길이, 독창성 등)
		CREATIVE_WORD: 2, // 5글자 이상 단어
		UNIQUE_WORD: 3, // 처음 사용하는 단어
		COMPLEX_SENTENCE: 5, // 15자 이상 문장
		METAPHOR_SENTENCE: 8, // 은유/비유 문장
		
		// 연속 활동 보너스
		STREAK_BONUS_2: 10, // 2일 연속
		STREAK_BONUS_7: 25, // 7일 연속
		STREAK_BONUS_30: 100, // 30일 연속
		
		// 협업 보너스
		FIRST_TO_HELP: 5, // 첫 좋아요를 누른 경우
		ENCOURAGING_COMMENT: 3, // 격려 메시지 (향후 기능)
		CLASS_PARTICIPATION: 2, // 수업 적극 참여
		
		// 시간 보너스
		EARLY_BIRD: 5, // 수업 시작 5분 내 참여
		CONSISTENT_ACTIVITY: 3, // 일정한 간격으로 활동
		
		// 교육적 달성
		VOCABULARY_GROWTH: 10, // 새로운 어휘 사용
		SENTENCE_IMPROVEMENT: 8, // 이전보다 향상된 문장 구조
		HELPING_OTHERS: 15 // 다른 학생 도움 (AI가 감지)
	};
	
	// 배지 시스템
	const BADGES = {
		WORD_COLLECTOR: { name: '단어 수집가', requirement: 50, emoji: '📚', description: '50개 이상의 단어를 수집했어요!' },
		SENTENCE_MASTER: { name: '문장 달인', requirement: 100, emoji: '✍️', description: '100개 이상의 문장을 작성했어요!' },
		LIKE_SPREADER: { name: '응원의 달인', requirement: 200, emoji: '💝', description: '200개 이상의 좋아요를 나눠줬어요!' },
		STREAK_WARRIOR: { name: '꾸준함의 전사', requirement: 30, emoji: '🔥', description: '30일 연속으로 활동했어요!' },
		CREATIVITY_GENIUS: { name: '창의성의 천재', requirement: 1000, emoji: '🎨', description: '창의성 포인트 1000점을 달성했어요!' },
		TEAM_PLAYER: { name: '팀워크의 달인', requirement: 500, emoji: '🤝', description: '다른 친구들을 많이 도와줬어요!' },
		EARLY_BIRD: { name: '부지런한 올빼미', requirement: 10, emoji: '🦉', description: '10번 이상 일찍 참여했어요!' },
		WORD_PIONEER: { name: '단어 개척자', requirement: 20, emoji: '🚀', description: '20개 이상의 독창적인 단어를 발견했어요!' }
	};
	
	// 레벨별 특전
	const LEVEL_PERKS = {
		2: { perk: 'word_hint', name: '단어 힌트' },
		3: { perk: 'double_points_1hr', name: '1시간 더블 포인트' },
		5: { perk: 'custom_profile', name: '프로필 꾸미기' },
		7: { perk: 'ai_feedback_premium', name: 'AI 프리미엄 피드백' },
		10: { perk: 'mentor_badge', name: '멘토 배지' }
	};
	
	// 고급 포인트 계산 함수
	async function calculateAdvancedPoints(
		basePoints: number, 
		activity: string, 
		content?: string,
		context?: any
	): Promise<number> {
		let totalPoints = basePoints;
		let bonusDetails: string[] = [];
		
		// 창의성 보너스
		if (activity === 'word' && content) {
			if (content.length >= 5) {
				totalPoints += POINT_RULES.CREATIVE_WORD;
				bonusDetails.push('창의적인 긴 단어 (+2)');
			}
			
			// 독창성 검사 (이 단어가 이 수업에서 처음 사용되는지)
			if (await isUniqueWord(content, classId)) {
				totalPoints += POINT_RULES.UNIQUE_WORD;
				bonusDetails.push('독창적인 단어 (+3)');
			}
		}
		
		if (activity === 'sentence' && content) {
			if (content.length >= 15) {
				totalPoints += POINT_RULES.COMPLEX_SENTENCE;
				bonusDetails.push('풍부한 문장 (+5)');
			}
			
			// 은유/비유 표현 감지 (간단한 키워드 기반)
			const metaphorKeywords = ['같은', '처럼', '마치', '듯이', '것만 같다', '느낌', '연상'];
			if (metaphorKeywords.some(keyword => content.includes(keyword))) {
				totalPoints += POINT_RULES.METAPHOR_SENTENCE;
				bonusDetails.push('은유적 표현 (+8)');
			}
		}
		
		// 연속 활동 보너스
		const streakBonus = calculateStreakBonus(currentStreak);
		if (streakBonus > 0) {
			totalPoints += streakBonus;
			bonusDetails.push(`연속 활동 보너스 (+${streakBonus})`);
		}
		
		// 시간 보너스 (수업 시작 5분 내)
		if (context?.isEarlyParticipation) {
			totalPoints += POINT_RULES.EARLY_BIRD;
			bonusDetails.push('일찍 참여 보너스 (+5)');
		}
		
		// 협업 보너스
		if (activity === 'like' && context?.isFirstLike) {
			totalPoints += POINT_RULES.FIRST_TO_HELP;
			bonusDetails.push('첫 번째 응원 (+5)');
		}
		
		// 창의성 배수 적용
		if (creativityMultiplier > 1.0) {
			const bonus = Math.floor(totalPoints * (creativityMultiplier - 1.0));
			totalPoints += bonus;
			bonusDetails.push(`창의성 배수 x${creativityMultiplier.toFixed(1)} (+${bonus})`);
		}
		
		// 보너스 상세 내역을 콘솔에 출력
		if (bonusDetails.length > 0) {
			console.log('🎁 포인트 보너스:', bonusDetails.join(', '));
		}
		
		return totalPoints;
	}
	
	// 독창적인 단어인지 확인
	async function isUniqueWord(word: string, classId: string): Promise<boolean> {
		try {
			// 이 부분은 실제로는 Firestore 쿼리로 구현해야 함
			// 지금은 간단한 로직으로 대체
			const words = await getClassWords(classId);
			const wordCount = words.filter(w => w.text === word).length;
			return wordCount <= 1; // 처음이거나 두 번째 사용
		} catch (error) {
			console.error('독창성 검사 오류:', error);
			return false;
		}
	}
	
	// 클래스의 모든 단어 가져오기 (캐싱 필요)
	async function getClassWords(classId: string): Promise<any[]> {
		// 실제 구현에서는 Firestore에서 단어 목록을 가져옴
		// 캐싱을 통해 성능 최적화 필요
		return [];
	}
	
	// 연속 활동 보너스 계산
	function calculateStreakBonus(streak: number): number {
		if (streak >= 30) return POINT_RULES.STREAK_BONUS_30;
		if (streak >= 7) return POINT_RULES.STREAK_BONUS_7;
		if (streak >= 2) return POINT_RULES.STREAK_BONUS_2;
		return 0;
	}
	
	// 배지 획득 확인
	async function checkBadgeEligibility(userStats: any): Promise<string[]> {
		const newBadges: string[] = [];
		
		Object.entries(BADGES).forEach(([badgeId, badge]) => {
			const hasEarned = checkBadgeRequirement(badgeId, badge.requirement, userStats);
			if (hasEarned && !userStats.badges?.includes(badgeId)) {
				newBadges.push(badgeId);
			}
		});
		
		return newBadges;
	}
	
	function checkBadgeRequirement(badgeId: string, requirement: number, userStats: any): boolean {
		switch (badgeId) {
			case 'WORD_COLLECTOR':
				return userStats.totalWords >= requirement;
			case 'SENTENCE_MASTER':
				return userStats.totalSentences >= requirement;
			case 'LIKE_SPREADER':
				return userStats.totalLikesGiven >= requirement;
			case 'STREAK_WARRIOR':
				return userStats.maxStreak >= requirement;
			case 'CREATIVITY_GENIUS':
				return userStats.creativityPoints >= requirement;
			case 'TEAM_PLAYER':
				return userStats.helpingPoints >= requirement;
			default:
				return false;
		}
	}
	
	// 레벨업 시 특전 알림
	function getLevelUpPerks(newLevel: number): any {
		return LEVEL_PERKS[newLevel] || null;
	}
	
	// 매일 활동 추적 업데이트
	async function updateDailyActivity() {
		try {
			const today = new Date().toDateString();
			const userRef = doc(db, `users/${user.uid}`);
			const userDoc = await getDoc(userRef);
			
			if (userDoc.exists()) {
				const userData = userDoc.data();
				const lastActiveDate = userData.lastActiveDate;
				
				if (lastActiveDate !== today) {
					// 새로운 날의 첫 활동
					const wasYesterday = isYesterday(lastActiveDate);
					const newStreak = wasYesterday ? (userData.currentStreak || 0) + 1 : 1;
					
					await updateDoc(userRef, {
						lastActiveDate: today,
						currentStreak: newStreak,
						maxStreak: Math.max(newStreak, userData.maxStreak || 0),
						todayActivities: 1,
						updatedAt: serverTimestamp()
					});
					
					currentStreak = newStreak;
					todayActivities = 1;
				} else {
					// 같은 날 추가 활동
					const newTodayCount = (userData.todayActivities || 0) + 1;
					await updateDoc(userRef, {
						todayActivities: newTodayCount,
						updatedAt: serverTimestamp()
					});
					
					todayActivities = newTodayCount;
				}
			}
		} catch (error) {
			console.error('일일 활동 업데이트 오류:', error);
		}
	}
	
	function isYesterday(dateString: string): boolean {
		if (!dateString) return false;
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		return dateString === yesterday.toDateString();
	}
	
	// 외부에서 사용할 수 있도록 함수들을 export
	export { calculateAdvancedPoints, updateDailyActivity, checkBadgeEligibility, getLevelUpPerks };
</script>

<div class="advanced-points-system">
	<!-- 연속 활동 스트릭 표시 -->
	{#if currentStreak > 0}
		<div class="streak-display bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-3 mb-4 border border-orange-200">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-2xl">🔥</span>
					<div>
						<div class="font-bold text-orange-800">
							{currentStreak}일 연속 활동!
						</div>
						<div class="text-sm text-orange-600">
							계속 이어가서 보너스를 받아보세요!
						</div>
					</div>
				</div>
				<div class="text-right">
					<div class="text-xs text-orange-500">다음 보너스까지</div>
					<div class="font-semibold text-orange-700">
						{#if currentStreak < 7}
							{7 - currentStreak}일
						{:else if currentStreak < 30}
							{30 - currentStreak}일
						{:else}
							최고 달성! 🎉
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- 창의성 배수 표시 -->
	{#if creativityMultiplier > 1.0}
		<div class="creativity-multiplier bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-3 mb-4 border border-purple-200">
			<div class="flex items-center gap-2">
				<span class="text-2xl">🎨</span>
				<div>
					<div class="font-bold text-purple-800">
						창의성 배수 x{creativityMultiplier.toFixed(1)} 활성화!
					</div>
					<div class="text-sm text-purple-600">
						모든 포인트가 {Math.round((creativityMultiplier - 1) * 100)}% 보너스로 증가합니다!
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- 오늘의 활동 현황 -->
	<div class="daily-activity bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-3 mb-4 border border-green-200">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-2xl">📈</span>
				<div>
					<div class="font-bold text-green-800">오늘의 활동</div>
					<div class="text-sm text-green-600">{todayActivities}회 참여했어요!</div>
				</div>
			</div>
			<div class="flex gap-1">
				{#each Array(Math.min(todayActivities, 10)) as _, i}
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
				{/each}
				{#if todayActivities > 10}
					<span class="text-green-600 text-sm font-semibold">+{todayActivities - 10}</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.advanced-points-system {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>