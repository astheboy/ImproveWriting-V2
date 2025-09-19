<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { 
		doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, arrayUnion, arrayRemove,
		serverTimestamp
	} from 'firebase/firestore';

	export let classData: any;
	export let user: any;

	let currentPhase = 'waiting';
	let sharedImages: any = null;
	let words: any[] = [];
	let sentences: any[] = [];
	let aiHelper: any = null;
	let unsubscribes: Function[] = [];

	// 입력 상태
	let wordInput = '';
	let sentenceInput = '';
	let studentName = '';
	let nameInputShown = false;
	let isSubmitting = false;

	// 사용자 이름 설정 (익명 사용자용)
	let displayName = user?.displayName || user?.email || '';

	onMount(() => {
		// 익명 사용자인 경우 이름 입력 요청
		if (user?.isAnonymous && !displayName) {
			nameInputShown = true;
		}
		
		setupRealtimeListeners();
	});

	onDestroy(() => {
		unsubscribes.forEach(unsubscribe => unsubscribe());
	});

	// 실시간 리스너 설정
	function setupRealtimeListeners() {
		// 1. 앱 상태 리스너
		const appStateRef = doc(db, `classrooms/${classData.id}/appState/current`);
		const unsubAppState = onSnapshot(appStateRef, (docSnapshot) => {
			if (docSnapshot.exists()) {
				currentPhase = docSnapshot.data().currentPhase || 'waiting';
			} else {
				currentPhase = 'waiting';
			}
		});
		unsubscribes.push(unsubAppState);

		// 2. 공유 이미지 리스너
		const imageRef = doc(db, `classrooms/${classData.id}/sharedImages/current`);
		const unsubImages = onSnapshot(imageRef, (doc) => {
			if (doc.exists()) {
				sharedImages = doc.data();
			} else {
				sharedImages = null;
			}
		});
		unsubscribes.push(unsubImages);

		// 3. 낱말 리스너 (낱말 구름용)
		const wordsRef = collection(db, `classrooms/${classData.id}/words`);
		const wordsQuery = query(wordsRef, orderBy('createdAt', 'desc'));
		const unsubWords = onSnapshot(wordsQuery, (snapshot) => {
			words = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
		unsubscribes.push(unsubWords);

		// 4. 문장 리스너 (실시간 피드용)
		const sentencesRef = collection(db, `classrooms/${classData.id}/sentences`);
		const sentencesQuery = query(sentencesRef, orderBy('createdAt', 'desc'));
		const unsubSentences = onSnapshot(sentencesQuery, (snapshot) => {
			sentences = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
		unsubscribes.push(unsubSentences);

		// 5. AI 도우미 리스너
		const aiRef = doc(db, `classrooms/${classData.id}/aiHelper/current`);
		const unsubAi = onSnapshot(aiRef, (doc) => {
			if (doc.exists()) {
				aiHelper = doc.data();
			} else {
				aiHelper = null;
			}
		});
		unsubscribes.push(unsubAi);
	}

	// 이름 설정
	function setStudentName() {
		if (studentName.trim()) {
			displayName = studentName.trim();
			nameInputShown = false;
		}
	}

	// 낱말 제출
	async function submitWord() {
		if (!wordInput.trim() || isSubmitting) return;

		try {
			isSubmitting = true;
			await addDoc(collection(db, `classrooms/${classData.id}/words`), {
				text: wordInput.trim(),
				authorId: user.uid,
				createdAt: serverTimestamp()
			});
			wordInput = '';
		} catch (error) {
			console.error('Error submitting word:', error);
			alert('낱말 제출에 실패했습니다.');
		} finally {
			isSubmitting = false;
		}
	}

	// 문장 제출
	async function submitSentence() {
		if (!sentenceInput.trim() || isSubmitting) return;

		try {
			isSubmitting = true;
			await addDoc(collection(db, `classrooms/${classData.id}/sentences`), {
				text: sentenceInput.trim(),
				authorName: displayName || '익명',
				authorId: user.uid,
				likesBy: [],
				createdAt: serverTimestamp()
			});
			sentenceInput = '';
		} catch (error) {
			console.error('Error submitting sentence:', error);
			alert('문장 제출에 실패했습니다.');
		} finally {
			isSubmitting = false;
		}
	}

	// 공감(좋아요) 토글
	async function toggleLike(sentenceId: string, currentLikes: string[]) {
		try {
			const sentenceRef = doc(db, `classrooms/${classData.id}/sentences`, sentenceId);
			const userHasLiked = currentLikes.includes(user.uid);
			
			if (userHasLiked) {
				// 좋아요 취소
				await updateDoc(sentenceRef, {
					likesBy: arrayRemove(user.uid)
				});
			} else {
				// 좋아요 추가
				await updateDoc(sentenceRef, {
					likesBy: arrayUnion(user.uid)
				});
			}
		} catch (error) {
			console.error('Error toggling like:', error);
			alert('공감 표시에 실패했습니다.');
		}
	}

	// Enter 키 처리
	function handleKeyPress(event: KeyboardEvent, type: 'word' | 'sentence') {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (type === 'word') {
				submitWord();
			} else {
				submitSentence();
			}
		}
	}

	// 낱말 카운트 계산 (낱말 구름용)
	$: wordCounts = words.reduce((acc, word) => {
		acc[word.text] = (acc[word.text] || 0) + 1;
		return acc;
	}, {});

	$: maxCount = Math.max(...Object.values(wordCounts), 1);
	$: uniqueWords = Object.keys(wordCounts);

	// AI 헬퍼 데이터 파싱
	$: aiData = aiHelper?.content ? (() => {
		try {
			return JSON.parse(aiHelper.content);
		} catch (e) {
			return { content: aiHelper.content };
		}
	})() : null;

	// 활동 단계별 상태 메시지
	$: statusMessage = (() => {
		switch (currentPhase) {
			case 'waiting':
				return '선생님이 활동을 시작하면 이미지가 나타납니다.';
			case 'images_only':
				return '이미지를 자세히 관찰해보세요. 곧 낱말 입력이 시작됩니다!';
			case 'word_input_active':
				return '이미지를 보고 떠오르는 낱말을 입력해보세요!';
			case 'sentence_input_active':
				return '낱말 구름을 참고하여 창의적인 문장을 만들어보세요!';
			default:
				return '';
		}
	})();
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<!-- 이름 입력 모달 -->
{#if nameInputShown}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
			<h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">👋 환영합니다!</h2>
			<p class="text-gray-600 mb-6 text-center">활동에 참여하기 전에 이름을 알려주세요.</p>
			<input 
				type="text" 
				bind:value={studentName}
				placeholder="이름을 입력하세요"
				class="w-full p-3 border-2 border-gray-300 rounded-lg text-center text-lg mb-4 focus:border-blue-500 focus:outline-none"
				on:keypress={(e) => e.key === 'Enter' && setStudentName()}
			>
			<button 
				on:click={setStudentName}
				disabled={!studentName.trim()}
				class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg text-lg transition-colors"
			>
				시작하기
			</button>
		</div>
	</div>
{/if}

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="max-w-6xl mx-auto space-y-6">
		<!-- 헤더 -->
		<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
			<div class="text-center">
				<h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					{classData.className}
				</h1>
				<p class="text-gray-600 mt-2">안녕하세요, {displayName || '익명'}님! 🌟</p>
				<div class="mt-3">
					<span class="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
						{statusMessage}
					</span>
				</div>
			</div>
		</div>

		<!-- 메인 콘텐츠 -->
		<div class="grid lg:grid-cols-2 gap-6">
			<!-- 왼쪽: 이미지 및 활동 영역 -->
			<div class="space-y-6">
				<!-- 이미지 섹션 -->
				<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4 text-center">🖼️ 활동 이미지</h2>
					{#if sharedImages && currentPhase !== 'waiting'}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="group cursor-pointer">
								<img 
									src={sharedImages.url1} 
									alt={sharedImages.alt1} 
									class="w-full h-48 object-cover rounded-xl shadow-lg group-hover:shadow-2xl transition-all transform group-hover:scale-105"
								>
							</div>
							<div class="group cursor-pointer">
								<img 
									src={sharedImages.url2} 
									alt={sharedImages.alt2} 
									class="w-full h-48 object-cover rounded-xl shadow-lg group-hover:shadow-2xl transition-all transform group-hover:scale-105"
								>
							</div>
						</div>
					{:else}
						<div class="bg-gradient-to-br from-gray-100 to-gray-200 h-48 rounded-xl flex items-center justify-center">
							<div class="text-center text-gray-500">
								<div class="text-4xl mb-2">🎨</div>
								<p>활동이 시작되면 이미지가 나타납니다</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- 낱말 입력 섹션 -->
				{#if currentPhase === 'word_input_active' || currentPhase === 'sentence_input_active'}
					<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
						<h2 class="text-xl font-bold text-gray-800 mb-4 text-center">💭 낱말 입력</h2>
						<div class="flex gap-3">
							<input 
								type="text" 
								bind:value={wordInput}
								placeholder="이미지를 보고 떠오르는 낱말을 입력하세요..."
								class="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
								disabled={isSubmitting}
								on:keypress={(e) => handleKeyPress(e, 'word')}
							>
							<button 
								on:click={submitWord}
								disabled={!wordInput.trim() || isSubmitting}
								class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold px-6 py-3 rounded-xl transition-colors"
							>
								{#if isSubmitting}
									⏳
								{:else}
									제출
								{/if}
							</button>
						</div>
					</div>
				{/if}

				<!-- 문장 입력 섹션 -->
				{#if currentPhase === 'sentence_input_active'}
					<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
						<h2 class="text-xl font-bold text-gray-800 mb-4 text-center">✏️ 문장 작성</h2>
						<div class="space-y-3">
							<textarea 
								bind:value={sentenceInput}
								placeholder="낱말 구름의 단어들을 활용하여 창의적인 문장을 만들어보세요..."
								class="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-lg resize-none"
								rows="3"
								disabled={isSubmitting}
								on:keypress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitSentence())}
							></textarea>
							<button 
								on:click={submitSentence}
								disabled={!sentenceInput.trim() || isSubmitting}
								class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-colors text-lg"
							>
								{#if isSubmitting}
									제출 중... ⏳
								{:else}
									문장 제출하기 🚀
								{/if}
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- 오른쪽: 낱말 구름 및 문장 피드 -->
			<div class="space-y-6">
				<!-- AI 도우미 -->
				{#if aiData && (currentPhase === 'word_input_active' || currentPhase === 'sentence_input_active')}
					<div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-xl p-6 border border-yellow-200">
						<h3 class="text-lg font-bold text-orange-800 mb-4 text-center">🤖 AI 도우미</h3>
						{#if aiData.keywords}
							<div class="mb-4">
								<h4 class="font-semibold text-orange-700 mb-2">🔑 관련 키워드</h4>
								<div class="flex flex-wrap gap-2">
									{#each aiData.keywords as keyword}
										<span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-yellow-200 transition-colors"
											on:click={() => wordInput += (wordInput ? ' ' : '') + keyword}>
											{keyword}
										</span>
									{/each}
								</div>
							</div>
						{/if}
						{#if aiData.exampleSentence}
							<div>
								<h4 class="font-semibold text-orange-700 mb-2">💡 AI 추천 문장</h4>
								<p class="bg-white p-3 rounded-xl shadow-sm text-gray-800 text-sm">
									{aiData.exampleSentence}
								</p>
							</div>
						{/if}
					</div>
				{/if}

				<!-- 낱말 구름 -->
				{#if currentPhase !== 'waiting' && words.length > 0}
					<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
						<h3 class="text-lg font-bold text-gray-800 mb-4 text-center">☁️ 우리의 낱말 구름 ({words.length}개)</h3>
						<div class="flex flex-wrap gap-2 justify-center">
							{#each uniqueWords.slice(0, 30) as word}
								{@const count = wordCounts[word]}
								{@const fontSize = Math.min(0.8 + (count / maxCount) * 0.8, 1.5)}
								{@const opacity = 0.7 + (count / maxCount) * 0.3}
								<span 
									class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-200 transition-all transform hover:scale-105"
									style="font-size: {fontSize}rem; opacity: {opacity}"
									on:click={() => currentPhase === 'sentence_input_active' && (sentenceInput += (sentenceInput ? ' ' : '') + word)}
								>
									{word}
									{#if count > 1}
										<span class="text-xs text-blue-600">({count})</span>
									{/if}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- 문장 피드 -->
				{#if sentences.length > 0 && (currentPhase === 'sentence_input_active' || currentPhase === 'word_input_active')}
					<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
						<h3 class="text-lg font-bold text-gray-800 mb-4 text-center">📝 친구들의 문장 ({sentences.length}개)</h3>
						<div class="max-h-96 overflow-y-auto space-y-3 pr-2">
							{#each sentences.slice(0, 20) as sentence}
								{@const userHasLiked = sentence.likesBy?.includes(user.uid)}
								<div class="bg-gradient-to-r from-white to-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all">
									<p class="text-gray-800 mb-3 leading-relaxed">{sentence.text}</p>
									<div class="flex justify-between items-center">
										<span class="text-sm text-gray-500">✍️ {sentence.authorName || '익명'}</span>
										<button 
											on:click={() => toggleLike(sentence.id, sentence.likesBy || [])}
											class="flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all transform hover:scale-110 {userHasLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500'}"
										>
											<span class="text-base">{userHasLiked ? '❤️' : '🤍'}</span>
											<span class="font-medium">{sentence.likesBy?.length || 0}</span>
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>