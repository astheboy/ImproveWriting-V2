<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase/firebase';
	import { 
		doc, getDoc, onSnapshot, collection, query, orderBy, serverTimestamp,
		addDoc, deleteDoc, updateDoc, where, arrayUnion
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	let lessonId = $page.params.id;
	let lesson: any = null;
	let currentUser: any = null;
	let isTeacher = false;
	let loading = true;
	let unsubscribes: Function[] = [];
	
	// Lesson activity state
	let currentPhase = 'waiting';
	let sharedImages: any = null;
	let words: any[] = [];
	let sentences: any[] = [];
	let aiHelper: any = null;
	let participants: any[] = [];
	
	// UI state
	let newWordText = '';
	let newSentenceText = '';
	let isGeneratingImages = false;
	
	// Activity phases
	const phases = {
		waiting: { name: '대기중', color: 'gray' },
		images_only: { name: '이미지 보기', color: 'blue' },
		word_input_active: { name: '낱말 입력', color: 'green' },
		sentence_input_active: { name: '문장 작성', color: 'purple' }
	};

	onMount(async () => {
		// Monitor auth state
		const unsubAuth = auth.onAuthStateChanged(async (user) => {
			if (user) {
				currentUser = user;
				await loadLessonData();
				setupRealtimeListeners();
				
				// Auto-join lesson if student
				if (!isTeacher && lesson) {
					await joinLesson();
				}
			} else {
				goto('/');
			}
		});
		unsubscribes.push(unsubAuth);
	});

	onDestroy(() => {
		unsubscribes.forEach(unsubscribe => unsubscribe());
	});

	async function loadLessonData() {
		try {
			console.log('Loading lesson:', lessonId, 'for user:', currentUser?.uid);
			const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
			if (lessonDoc.exists()) {
				lesson = { id: lessonDoc.id, ...lessonDoc.data() };
				console.log('Loaded lesson data:', lesson);
				
				// Teacher 권한 확인 로직 수정
				if (lesson.createdBy) {
					isTeacher = lesson.createdBy === currentUser?.uid;
				} else {
					// createdBy가 없는 경우, classId를 통해 클래스 소유자 확인
					console.log('No createdBy field found, checking classId:', lesson.classId);
					if (lesson.classId) {
						try {
							const classDoc = await getDoc(doc(db, 'classrooms', lesson.classId));
							if (classDoc.exists()) {
								const classData = classDoc.data();
								isTeacher = classData.teacherId === currentUser?.uid;
								console.log('Class owner check - isTeacher:', isTeacher);
							}
						} catch (classError) {
							console.error('Error checking class ownership:', classError);
							isTeacher = false;
						}
					} else {
						isTeacher = false;
					}
				}
				
				console.log('Final isTeacher status:', isTeacher);
				loading = false;
			} else {
				console.error('Lesson not found:', lessonId);
				alert('레슨을 찾을 수 없습니다.');
				goto('/dashboard');
			}
		} catch (error) {
			console.error('Error loading lesson:', error);
			alert('레슨 로드에 실패했습니다.');
			goto('/dashboard');
		}
	}

	function setupRealtimeListeners() {
		if (!lesson) {
			console.warn('Cannot setup listeners: lesson is null');
			return;
		}

		console.log('Setting up real-time listeners for lesson:', lessonId);

		// 1. Lesson data listener
		const lessonRef = doc(db, 'lessons', lessonId);
		const unsubLesson = onSnapshot(lessonRef, 
			(doc) => {
				if (doc.exists()) {
					lesson = { id: doc.id, ...doc.data() };
					currentPhase = lesson.activityData?.currentPhase || 'waiting';
					console.log('Lesson updated, currentPhase:', currentPhase);
				}
			},
			(error) => {
				console.error('Error in lesson listener:', error);
			}
		);
		unsubscribes.push(unsubLesson);

		// 2. Shared images listener
		const imageRef = doc(db, `lessons/${lessonId}/sharedImages/current`);
		const unsubImages = onSnapshot(imageRef, 
			(doc) => {
				sharedImages = doc.exists() ? doc.data() : null;
			},
			(error) => {
				console.error('Error in images listener:', error);
			}
		);
		unsubscribes.push(unsubImages);

		// 3. Words listener
		const wordsRef = collection(db, `lessons/${lessonId}/words`);
		const wordsQuery = query(wordsRef, orderBy('createdAt', 'asc'));
		const unsubWords = onSnapshot(wordsQuery, 
			(snapshot) => {
				words = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data()
				}));
			},
			(error) => {
				console.error('Error in words listener:', error);
			}
		);
		unsubscribes.push(unsubWords);

		// 4. Sentences listener
		const sentencesRef = collection(db, `lessons/${lessonId}/sentences`);
		const sentencesQuery = query(sentencesRef, orderBy('createdAt', 'asc'));
		const unsubSentences = onSnapshot(sentencesQuery, 
			(snapshot) => {
				sentences = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data()
				}));
			},
			(error) => {
				console.error('Error in sentences listener:', error);
			}
		);
		unsubscribes.push(unsubSentences);

		// 5. AI helper listener
		const aiRef = doc(db, `lessons/${lessonId}/aiHelper/current`);
		const unsubAi = onSnapshot(aiRef, 
			(doc) => {
				aiHelper = doc.exists() ? doc.data() : null;
			},
			(error) => {
				console.error('Error in AI helper listener:', error);
			}
		);
		unsubscribes.push(unsubAi);

		// 6. Participants listener (for teachers)
		if (isTeacher) {
			const participantsRef = collection(db, `lessons/${lessonId}/participants`);
			const unsubParticipants = onSnapshot(participantsRef, 
				(snapshot) => {
					participants = snapshot.docs.map(doc => ({
						id: doc.id,
						...doc.data()
					}));
				},
				(error) => {
					console.error('Error in participants listener:', error);
				}
			);
			unsubscribes.push(unsubParticipants);
		}
	}

	// Join lesson as participant
	async function joinLesson() {
		if (!currentUser || !lesson) return;

		try {
			// Add to participants subcollection
			const participantRef = doc(db, `lessons/${lessonId}/participants`, currentUser.uid);
			const participantData = {
				userId: currentUser.uid,
				displayName: currentUser.displayName || '학생',
				email: currentUser.email,
				joinedAt: serverTimestamp(),
				isActive: true
			};
			
			await updateDoc(participantRef, participantData).catch(() => 
				addDoc(collection(db, `lessons/${lessonId}/participants`), participantData)
			);

			// Update lesson participants array
			const lessonRef = doc(db, 'lessons', lessonId);
			await updateDoc(lessonRef, {
				participants: arrayUnion(currentUser.uid)
			});
		} catch (error) {
			console.error('Error joining lesson:', error);
		}
	}

	// Phase management (Teacher only)
	async function updatePhase(newPhase: string) {
		if (!isTeacher) return;
		
		try {
			const lessonRef = doc(db, 'lessons', lessonId);
			await updateDoc(lessonRef, {
				'activityData.currentPhase': newPhase,
				'activityData.updatedAt': serverTimestamp()
			});
		} catch (error) {
			console.error('Error updating phase:', error);
			alert('단계 변경에 실패했습니다.');
		}
	}

	// Start new activity with images (Teacher only)
	async function startNewActivity() {
		if (!isTeacher) return;

		try {
			isGeneratingImages = true;
			const startNewActivityFn = httpsCallable(functions, 'startNewActivityForLesson');
			
			await startNewActivityFn({ lessonId });
			await updatePhase('images_only');
		} catch (error) {
			console.error('Error starting new activity:', error);
			alert('새로운 활동 시작에 실패했습니다.');
		} finally {
			isGeneratingImages = false;
		}
	}

	// Submit word (Student)
	async function submitWord() {
		if (!newWordText.trim() || currentPhase !== 'word_input_active') return;
		
		try {
			const wordData = {
				text: newWordText.trim(),
				authorId: currentUser?.uid,
				authorName: currentUser?.displayName || '학생',
				createdAt: serverTimestamp(),
				lessonId: lessonId
			};
			
			await addDoc(collection(db, `lessons/${lessonId}/words`), wordData);
			newWordText = '';

			// Award points for word submission
			if (!isTeacher) {
				try {
					const awardPointsFn = httpsCallable(functions, 'awardPoints');
					await awardPointsFn({
						userId: currentUser?.uid,
						points: 10,
						reason: 'word_submission',
						details: `단어 제출: ${wordData.text}`
					});
				} catch (pointsError) {
					console.error('Error awarding points:', pointsError);
				}
			}
		} catch (error) {
			console.error('Error submitting word:', error);
			alert('낱말 제출에 실패했습니다.');
		}
	}

	// Submit sentence (Student)
	async function submitSentence() {
		if (!newSentenceText.trim() || currentPhase !== 'sentence_input_active') return;
		
		try {
			const sentenceData = {
				text: newSentenceText.trim(),
				authorId: currentUser?.uid,
				authorName: currentUser?.displayName || '학생',
				createdAt: serverTimestamp(),
				lessonId: lessonId,
				likesBy: []
			};
			
			await addDoc(collection(db, `lessons/${lessonId}/sentences`), sentenceData);
			newSentenceText = '';

			// Award points for sentence submission
			if (!isTeacher) {
				try {
					const awardPointsFn = httpsCallable(functions, 'awardPoints');
					await awardPointsFn({
						userId: currentUser?.uid,
						points: 20,
						reason: 'sentence_submission',
						details: `문장 제출: ${sentenceData.text}`
					});
				} catch (pointsError) {
					console.error('Error awarding points:', pointsError);
				}
			}
		} catch (error) {
			console.error('Error submitting sentence:', error);
			alert('문장 제출에 실패했습니다.');
		}
	}

	// Like sentence
	async function likeSentence(sentenceId: string, currentLikes: string[]) {
		if (!currentUser || isTeacher) return;
		
		try {
			const sentenceRef = doc(db, `lessons/${lessonId}/sentences`, sentenceId);
			const isLiked = currentLikes.includes(currentUser.uid);
			
			if (isLiked) {
				// Remove like
				const newLikes = currentLikes.filter(uid => uid !== currentUser.uid);
				await updateDoc(sentenceRef, { likesBy: newLikes });
			} else {
				// Add like
				await updateDoc(sentenceRef, { 
					likesBy: arrayUnion(currentUser.uid) 
				});
				
				// Award points for giving like
				try {
					const awardPointsFn = httpsCallable(functions, 'awardPoints');
					await awardPointsFn({
						userId: currentUser.uid,
						points: 5,
						reason: 'like_given',
						details: '문장에 좋아요 표시'
					});
				} catch (pointsError) {
					console.error('Error awarding points:', pointsError);
				}
			}
		} catch (error) {
			console.error('Error liking sentence:', error);
		}
	}

	// Request AI inspiration (Teacher only)
	async function requestAiInspiration() {
		if (!isTeacher) return;
		
		try {
			const getAiInspirationFn = httpsCallable(functions, 'getAiInspirationForLesson');
			await getAiInspirationFn({ lessonId });
		} catch (error) {
			console.error('Error getting AI inspiration:', error);
			alert('AI 영감 요청에 실패했습니다.');
		}
	}

	// Go back
	function goBack() {
		if (isTeacher) {
			// 교사는 클래스 관리 페이지로 이동 (수업 목록)
			goto(`/class/${lesson?.classId}`);
		} else {
			// 학생은 클래스 목록으로 이동
			goto('/student/classes');
		}
	}

	// AI helper data parsing
	$: aiData = aiHelper?.content ? (() => {
		try {
			return JSON.parse(aiHelper.content);
		} catch (e) {
			return { content: aiHelper.content };
		}
	})() : null;
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-100 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="bg-white rounded-lg shadow-md p-8 text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
			<p class="text-gray-600">레슨을 불러오는 중...</p>
		</div>
	</div>
{:else if lesson}
	<main class="min-h-screen bg-gray-100 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="max-w-7xl mx-auto space-y-6">
			<!-- Header -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<button 
					on:click={goBack}
					class="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-2"
				>
					← {isTeacher ? '수업 관리로 돌아가기' : '내 클래스로 돌아가기'}
				</button>
				
				<div class="flex justify-between items-start">
					<div>
						{#if isTeacher}
							<div class="text-sm text-gray-500 mb-2">
								🎮 활동 제어 패널
							</div>
						{/if}
						<h1 class="text-3xl font-bold text-gray-800">{lesson.title}</h1>
						{#if lesson.description}
							<p class="text-sm text-gray-600 mt-1">{lesson.description}</p>
						{/if}
						{#if isTeacher}
							<p class="text-xs text-gray-500 mt-2">
								ℹ️ 이 페이지에서 활동 단계를 실시간 제어하세요. 수업 생성/삭제는 수업 관리 페이지에서 가능합니다.
							</p>
						{/if}
						<div class="flex items-center gap-4 mt-3">
							<span class="text-sm px-3 py-1 rounded-full bg-purple-100 text-purple-600">
								{lesson.type === 'creative_writing' ? '📝 창의글쓰기' : 
								 lesson.type === 'vocabulary_game' ? '🎮 단어게임' : '💬 토론'}
							</span>
							<span class="text-sm px-3 py-1 rounded-full {phases[currentPhase]?.color === 'gray' ? 'bg-gray-100 text-gray-600' : phases[currentPhase]?.color === 'blue' ? 'bg-blue-100 text-blue-600' : phases[currentPhase]?.color === 'green' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}">
								{phases[currentPhase]?.name || '알 수 없음'}
							</span>
							{#if isTeacher}
								<span class="text-sm text-gray-500">👥 참여자: {lesson.participants?.length || 0}명</span>
							{/if}
						</div>
					</div>
					<div class="text-right">
						{#if isTeacher}
							<span class="text-sm text-gray-500 block">선생님 모드</span>
						{:else}
							<span class="text-sm text-gray-500 block">학생 모드</span>
						{/if}
						<span class="text-xs text-gray-400">{currentUser?.displayName}</span>
					</div>
				</div>
			</div>

			<!-- Teacher Controls -->
			{#if isTeacher}
				<div class="bg-white rounded-lg shadow-md p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">🎮 활동 제어 패널</h2>
					<div class="flex flex-wrap gap-3">
						{#if currentPhase === 'waiting'}
							<button 
								on:click={startNewActivity}
								disabled={isGeneratingImages}
								class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
							>
								{#if isGeneratingImages}
									<div class="flex items-center gap-2">
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										이미지 생성 중...
									</div>
								{:else}
									🚀 새로운 활동 시작
								{/if}
							</button>
						{:else if currentPhase === 'images_only'}
							<button 
								on:click={() => updatePhase('word_input_active')}
								class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
							>
								📝 낱말 입력 활성화
							</button>
						{:else if currentPhase === 'word_input_active'}
							<button 
								on:click={() => updatePhase('sentence_input_active')}
								class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
							>
								✏️ 문장 작성 활성화
							</button>
						{/if}

						{#if currentPhase !== 'waiting'}
							<button 
								on:click={requestAiInspiration}
								class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg"
							>
								🤖 AI 영감 요청
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Main Content Grid -->
			<div class="grid lg:grid-cols-2 gap-6">
				<!-- Left: Images and AI Helper -->
				<div class="space-y-6">
					<!-- Shared Images -->
					<div class="bg-white rounded-lg shadow-md p-6">
						<h3 class="text-lg font-bold text-gray-800 mb-4">🖼️ 활동 이미지</h3>
						{#if sharedImages}
							<div class="grid grid-cols-2 gap-4">
								<img src={sharedImages.url1} alt={sharedImages.alt1} class="w-full h-32 object-cover rounded-lg shadow-sm">
								<img src={sharedImages.url2} alt={sharedImages.alt2} class="w-full h-32 object-cover rounded-lg shadow-sm">
							</div>
						{:else}
							<div class="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
								<p class="text-gray-500">
									{currentPhase === 'waiting' ? '활동을 시작하면 이미지가 표시됩니다' : '이미지 로딩 중...'}
								</p>
							</div>
						{/if}
					</div>

					<!-- AI Helper -->
					{#if aiData}
						<div class="bg-purple-50 rounded-lg shadow-md p-6">
							<h3 class="text-lg font-bold text-purple-800 mb-4">🤖 AI 도우미</h3>
							{#if aiData.keywords}
								<div class="mb-4">
									<h4 class="font-semibold text-purple-700 mb-2">🔑 관련 키워드</h4>
									<div class="flex flex-wrap gap-2">
										{#each aiData.keywords as keyword}
											<span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
												{keyword}
											</span>
										{/each}
									</div>
								</div>
							{/if}
							{#if aiData.exampleSentence}
								<div>
									<h4 class="font-semibold text-purple-700 mb-2">💡 AI 추천 문장</h4>
									<p class="bg-white p-3 rounded-md shadow-sm text-gray-800">
										{aiData.exampleSentence}
									</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Right: Activity Data -->
				<div class="space-y-6">
					<!-- Word Input (Students) -->
					{#if !isTeacher && currentPhase === 'word_input_active'}
						<div class="bg-white rounded-lg shadow-md p-6">
							<h3 class="text-lg font-bold text-gray-800 mb-4">📝 낱말 입력</h3>
							<div class="flex gap-2">
								<input 
									bind:value={newWordText}
									on:keydown={(e) => e.key === 'Enter' && submitWord()}
									class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
									placeholder="이미지를 보고 떠오르는 낱말을 입력하세요..."
								>
								<button 
									on:click={submitWord}
									disabled={!newWordText.trim()}
									class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-bold"
								>
									제출
								</button>
							</div>
						</div>
					{/if}

					<!-- Sentence Input (Students) -->
					{#if !isTeacher && currentPhase === 'sentence_input_active'}
						<div class="bg-white rounded-lg shadow-md p-6">
							<h3 class="text-lg font-bold text-gray-800 mb-4">✏️ 문장 작성</h3>
							<div class="space-y-3">
								<textarea 
									bind:value={newSentenceText}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
									rows="3"
									placeholder="이미지와 낱말들을 활용해 창의적인 문장을 작성해보세요..."
								></textarea>
								<button 
									on:click={submitSentence}
									disabled={!newSentenceText.trim()}
									class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-bold w-full"
								>
									문장 제출
								</button>
							</div>
						</div>
					{/if}

					<!-- Words Cloud -->
					<div class="bg-white rounded-lg shadow-md p-6">
						<h3 class="text-lg font-bold text-gray-800 mb-4">☁️ 낱말 구름 ({words.length}개)</h3>
						{#if words.length === 0}
							<p class="text-gray-500 text-center py-4">아직 제출된 낱말이 없습니다</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each words as word}
									<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
										{word.text}
										<span class="text-xs opacity-70">({word.authorName})</span>
									</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Sentences Feed -->
					<div class="bg-white rounded-lg shadow-md p-6">
						<h3 class="text-lg font-bold text-gray-800 mb-4">📝 문장 피드 ({sentences.length}개)</h3>
						<div class="max-h-80 overflow-y-auto space-y-3">
							{#if sentences.length === 0}
								<p class="text-gray-500 text-center py-4">아직 제출된 문장이 없습니다</p>
							{:else}
								{#each sentences as sentence}
									<div class="border rounded-lg p-3 bg-gray-50">
										<p class="text-gray-800 mb-2">{sentence.text}</p>
										<div class="flex justify-between items-center text-sm text-gray-500">
											<span>{sentence.authorName}</span>
											<div class="flex items-center gap-2">
												<span>❤️ {sentence.likesBy?.length || 0}</span>
												{#if !isTeacher && currentUser && !sentence.likesBy?.includes(currentUser.uid)}
													<button 
														on:click={() => likeSentence(sentence.id, sentence.likesBy || [])}
														class="text-red-500 hover:text-red-700 text-sm"
													>
														좋아요
													</button>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
{:else}
	<div class="min-h-screen bg-gray-100 flex items-center justify-center" style="font-family: 'Noto Sans KR', sans-serif;">
		<div class="bg-white rounded-lg shadow-md p-8 text-center">
			<p class="text-red-600">레슨을 찾을 수 없습니다.</p>
			<button 
				on:click={() => goto('/dashboard')}
				class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
			>
				대시보드로 돌아가기
			</button>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>