<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, scale, fly } from 'svelte/transition';
	
	export let showLevelUpModal = false;
	export let showPointsGained = false;
	export let pointsGained = 0;
	export let newLevel = 1;
	export let oldLevel = 1;
	export let currentPoints = 0;
	export let userName = '익명';

	let pointsAnimation = false;
	let levelUpAnimation = false;
	let confettiElements: HTMLElement[] = [];

	const dispatch = createEventDispatcher();

	// 포인트 획득 애니메이션 트리거
	export function triggerPointsAnimation(points: number) {
		pointsGained = points;
		showPointsGained = true;
		pointsAnimation = true;

		// 3초 후 애니메이션 종료
		setTimeout(() => {
			showPointsGained = false;
			pointsAnimation = false;
		}, 3000);
	}

	// 레벨업 애니메이션 트리거
	export function triggerLevelUpAnimation(oldLev: number, newLev: number) {
		oldLevel = oldLev;
		newLevel = newLev;
		showLevelUpModal = true;
		levelUpAnimation = true;
		
		// 축하 효과음 (Web Audio API 사용)
		playLevelUpSound();
		
		// 풍선색종이 효과
		createConfetti();
	}

	function playLevelUpSound() {
		try {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			
			// 성공 효과음을 위한 간단한 톤 시퀀스
			const frequencies = [523, 659, 784, 1047]; // C, E, G, C octave
			
			frequencies.forEach((freq, index) => {
				setTimeout(() => {
					const oscillator = audioContext.createOscillator();
					const gainNode = audioContext.createGain();
					
					oscillator.connect(gainNode);
					gainNode.connect(audioContext.destination);
					
					oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
					oscillator.type = 'sine';
					
					gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
					gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
					
					oscillator.start(audioContext.currentTime);
					oscillator.stop(audioContext.currentTime + 0.5);
				}, index * 200);
			});
		} catch (error) {
			console.log('웹 오디오 API를 사용할 수 없습니다:', error);
		}
	}

	function createConfetti() {
		const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];
		const confettiContainer = document.getElementById('confetti-container');
		
		if (!confettiContainer) return;

		for (let i = 0; i < 50; i++) {
			const confetti = document.createElement('div');
			confetti.className = 'confetti-piece';
			confetti.style.cssText = `
				position: absolute;
				width: 10px;
				height: 10px;
				background-color: ${colors[Math.floor(Math.random() * colors.length)]};
				left: ${Math.random() * 100}%;
				top: -10px;
				border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
				animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
				transform: rotate(${Math.random() * 360}deg);
			`;
			
			confettiContainer.appendChild(confetti);
			confettiElements.push(confetti);
			
			// 애니메이션 완료 후 제거
			setTimeout(() => {
				if (confetti.parentNode) {
					confetti.parentNode.removeChild(confetti);
				}
			}, 5000);
		}
	}

	function closeLevelUpModal() {
		showLevelUpModal = false;
		levelUpAnimation = false;
		dispatch('levelUpModalClosed');
		
		// 풍선색종이 정리
		confettiElements.forEach(el => {
			if (el.parentNode) {
				el.parentNode.removeChild(el);
			}
		});
		confettiElements = [];
	}

	// 포인트 유형별 메시지
	function getPointMessage(points: number) {
		if (points >= 50) return `대박! ${points} 포인트 획득! 🚀`;
		if (points >= 20) return `훌륭해요! ${points} 포인트 획득! ✨`;
		if (points >= 10) return `좋아요! ${points} 포인트 획득! 👍`;
		return `${points} 포인트 획득! 🎉`;
	}

	// 레벨별 축하 메시지
	function getLevelUpMessage(level: number) {
		if (level >= 10) return '전설적인 작가가 되었어요!';
		if (level >= 5) return '숙련된 작가가 되었어요!';
		if (level >= 3) return '실력 있는 작가가 되었어요!';
		return '새로운 작가가 되었어요!';
	}

	onMount(() => {
		// CSS 애니메이션 정의를 동적으로 추가
		const style = document.createElement('style');
		style.textContent = `
			@keyframes confetti-fall {
				0% {
					transform: translateY(-100vh) rotate(0deg);
					opacity: 1;
				}
				100% {
					transform: translateY(100vh) rotate(360deg);
					opacity: 0;
				}
			}
			
			@keyframes bounce-in {
				0% {
					transform: scale(0);
					opacity: 0;
				}
				50% {
					transform: scale(1.1);
					opacity: 1;
				}
				100% {
					transform: scale(1);
					opacity: 1;
				}
			}
			
			@keyframes pulse-glow {
				0%, 100% {
					box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
				}
				50% {
					box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
				}
			}
		`;
		document.head.appendChild(style);

		return () => {
			// 컴포넌트 정리 시 스타일 제거
			if (style.parentNode) {
				style.parentNode.removeChild(style);
			}
		};
	});
</script>

<!-- 풍선색종이 컨테이너 -->
<div id="confetti-container" class="fixed inset-0 pointer-events-none z-50"></div>

<!-- 포인트 획득 애니메이션 -->
{#if showPointsGained}
	<div 
		class="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
		in:fly={{ y: -50, duration: 500 }}
		out:fade={{ duration: 1000 }}
	>
		<div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-lg flex items-center gap-2"
			 style="animation: bounce-in 0.5s ease-out, pulse-glow 2s ease-in-out infinite;">
			<span class="text-2xl">✨</span>
			<span>{getPointMessage(pointsGained)}</span>
		</div>
	</div>
{/if}

<!-- 레벨업 모달 -->
{#if showLevelUpModal}
	<div class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
		 in:fade={{ duration: 300 }}>
		<div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-yellow-300"
			 in:scale={{ duration: 500, start: 0.5 }}>
			
			<!-- 레벨업 헤더 -->
			<div class="text-center mb-6">
				<div class="text-6xl mb-4 animate-bounce">🎉</div>
				<h2 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
					레벨 업!
				</h2>
				<p class="text-gray-600">축하합니다, {userName}님!</p>
			</div>

			<!-- 레벨 변화 표시 -->
			<div class="flex items-center justify-center gap-4 mb-6">
				<div class="text-center">
					<div class="text-sm text-gray-500 mb-1">이전 레벨</div>
					<div class="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold text-gray-600">
						{oldLevel}
					</div>
				</div>
				
				<div class="text-4xl text-yellow-500 animate-pulse">→</div>
				
				<div class="text-center">
					<div class="text-sm text-gray-500 mb-1">새 레벨</div>
					<div class="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
						 style="animation: pulse-glow 1s ease-in-out infinite;">
						{newLevel}
					</div>
				</div>
			</div>

			<!-- 축하 메시지 -->
			<div class="text-center mb-6">
				<p class="text-lg font-semibold text-purple-700 mb-2">
					{getLevelUpMessage(newLevel)}
				</p>
				<p class="text-gray-600 text-sm">
					계속해서 창의적인 글쓰기를 해보세요!
				</p>
			</div>

			<!-- 레벨업 혜택 안내 -->
			<div class="bg-white rounded-2xl p-4 mb-6 border border-yellow-200">
				<h3 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
					<span class="text-yellow-500">🎁</span>
					<span>레벨 {newLevel} 혜택</span>
				</h3>
				<ul class="text-sm text-gray-600 space-y-1">
					<li class="flex items-center gap-2">
						<span class="text-green-500">✓</span>
						<span>새로운 성취 배지 잠금 해제</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-green-500">✓</span>
						<span>포트폴리오에 특별 표시</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-green-500">✓</span>
						<span>더 다양한 활동 참여 가능</span>
					</li>
				</ul>
			</div>

			<!-- 닫기 버튼 -->
			<button 
				on:click={closeLevelUpModal}
				class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg">
				계속하기 🚀
			</button>
		</div>
	</div>
{/if}

<!-- 레벨 진행도 바 컴포넌트 -->
<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4">
	<div class="flex items-center justify-between mb-2">
		<div class="text-sm font-medium text-gray-600">
			레벨 {Math.floor(currentPoints / 100) + 1} 진행도
		</div>
		<div class="text-xs text-gray-500">
			{currentPoints % 100}/100
		</div>
	</div>
	
	<div class="w-full bg-gray-200 rounded-full h-3">
		<div 
			class="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
			style="width: {(currentPoints % 100)}%"
		>
			<!-- 진행도 바 반짝임 효과 -->
			<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-25 animate-pulse"></div>
		</div>
	</div>
	
	<div class="mt-2 text-xs text-center text-gray-500">
		{#if (currentPoints % 100) >= 90}
			레벨업까지 조금 남았어요! 🔥
		{:else if (currentPoints % 100) >= 50}
			절반을 넘었네요! 💪
		{:else}
			꾸준히 활동해보세요! ✨
		{/if}
	</div>
</div>

<style>
	:global(.confetti-piece) {
		z-index: 1000;
	}
</style>