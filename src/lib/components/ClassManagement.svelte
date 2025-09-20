<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, db, functions } from '$lib/firebase/firebase';
	import { 
		doc, setDoc, onSnapshot, collection, query, orderBy, serverTimestamp,
		addDoc, deleteDoc, updateDoc, where, getDocs
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	export let classData: any;

	let currentPhase = 'waiting';
	let sharedImages: any = null;
	let words: any[] = [];
	let sentences: any[] = [];
	let aiHelper: any = null;
	let isGeneratingImages = false;
	let unsubscribes: Function[] = [];

	// 편집 모드 상태
	let isEditingClass = false;
	let editedClassName = classData.className;
	let editedClassDescription = classData.description || '';
	let editingWordId: string | null = null;
	let editingWordText = '';
	let editingSentenceId: string | null = null;
	let editingSentenceText = '';

	// 레슨 상태
	let lessons: any[] = [];
	let isCreatingLesson = false;
	let newLessonTitle = '';
	let newLessonDescription = '';
	let newLessonType = 'creative_writing'; // creative_writing, vocabulary_game, discussion

	// 활동 단계 상태
	const phases = {
		waiting: { name: '대기중', color: 'gray' },
		images_only: { name: '이미지 보기', color: 'blue' },
		word_input_active: { name: '낱말 입력', color: 'green' },
		sentence_input_active: { name: '문장 작성', color: 'purple' }
	};

	onMount(() => {
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

		// 3. 낱말 리스너
		const wordsRef = collection(db, `classrooms/${classData.id}/words`);
		const wordsQuery = query(wordsRef, orderBy('createdAt', 'asc'));
		const unsubWords = onSnapshot(wordsQuery, (snapshot) => {
			words = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
		unsubscribes.push(unsubWords);

		// 4. 문장 리스너
		const sentencesRef = collection(db, `classrooms/${classData.id}/sentences`);
		const sentencesQuery = query(sentencesRef, orderBy('createdAt', 'asc'));
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

		// 6. 레슨 리스너
		const lessonsRef = collection(db, `lessons`);
		const lessonsQuery = query(lessonsRef, where('classId', '==', classData.id), orderBy('createdAt', 'desc'));
		const unsubLessons = onSnapshot(lessonsQuery, (snapshot) => {
			lessons = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
		unsubscribes.push(unsubLessons);
	}

	// 활동 단계 변경
	async function updatePhase(newPhase: string) {
		try {
			const appStateRef = doc(db, `classrooms/${classData.id}/appState/current`);
			await setDoc(appStateRef, { 
				currentPhase: newPhase, 
				updatedAt: serverTimestamp() 
			});
		} catch (error) {
			console.error('Error updating phase:', error);
			alert('단계 변경에 실패했습니다.');
		}
	}

	// 새로운 활동 시작 (이미지 생성)
	async function startNewActivity() {
		try {
			isGeneratingImages = true;
			const startNewActivityFn = httpsCallable(functions, 'startNewActivity');
			
			await startNewActivityFn({ classId: classData.id });
			
			// 성공적으로 시작되면 이미지 보기 단계로 이동
			await updatePhase('images_only');
		} catch (error) {
			console.error('Error starting new activity:', error);
			alert('새로운 활동 시작에 실패했습니다.');
		} finally {
			isGeneratingImages = false;
		}
	}

	// AI 영감 요청
	async function requestAiInspiration() {
		try {
			const getAiInspirationFn = httpsCallable(functions, 'getAiInspiration');
			await getAiInspirationFn({ classId: classData.id });
		} catch (error) {
			console.error('Error getting AI inspiration:', error);
			alert('AI 영감 요청에 실패했습니다.');
		}
	}

	// 낱말 삭제
	async function deleteWord(wordId: string) {
		if (confirm('이 낱말을 삭제하시겠습니까?')) {
			try {
				await deleteDoc(doc(db, `classrooms/${classData.id}/words`, wordId));
			} catch (error) {
				console.error('Error deleting word:', error);
				alert('낱말 삭제에 실패했습니다.');
			}
		}
	}

	// 문장 삭제
	async function deleteSentence(sentenceId: string) {
		if (confirm('이 문장을 삭제하시겠습니까?')) {
			try {
				await deleteDoc(doc(db, `classrooms/${classData.id}/sentences`, sentenceId));
			} catch (error) {
				console.error('Error deleting sentence:', error);
				alert('문장 삭제에 실패했습니다.');
			}
		}
	}

	// 활동 종료 및 초기화
	async function resetActivity() {
		if (confirm('현재 활동을 종료하고 모든 데이터를 초기화하시겠습니까?')) {
			try {
				// 모든 데이터 삭제
				const deletePromises = [
					...words.map(word => deleteDoc(doc(db, `classrooms/${classData.id}/words`, word.id))),
					...sentences.map(sentence => deleteDoc(doc(db, `classrooms/${classData.id}/sentences`, sentence.id)))
				];
				
				await Promise.all(deletePromises);
				
				// 단계를 대기로 변경
				await updatePhase('waiting');
			} catch (error) {
				console.error('Error resetting activity:', error);
				alert('활동 초기화에 실패했습니다.');
			}
		}
	}

	// 클래스 정보 수정
	async function updateClassInfo() {
		try {
			const classRef = doc(db, 'classrooms', classData.id);
			await updateDoc(classRef, {
				className: editedClassName,
				description: editedClassDescription,
				updatedAt: serverTimestamp()
			});
			
			// 로컬 데이터 업데이트
			classData.className = editedClassName;
			classData.description = editedClassDescription;
			
			isEditingClass = false;
			alert('클래스 정보가 성공적으로 업데이트되었습니다.');
		} catch (error) {
			console.error('Error updating class info:', error);
			alert('클래스 정보 업데이트에 실패했습니다.');
		}
	}

	// 클래스 편집 취소
	function cancelClassEdit() {
		editedClassName = classData.className;
		editedClassDescription = classData.description || '';
		isEditingClass = false;
	}

	// 낱말 편집 시작
	function startEditingWord(wordId: string, currentText: string) {
		editingWordId = wordId;
		editingWordText = currentText;
	}

	// 낱말 편집 저장
	async function saveWordEdit() {
		if (!editingWordId || !editingWordText.trim()) return;
		
		try {
			const wordRef = doc(db, `classrooms/${classData.id}/words`, editingWordId);
			await updateDoc(wordRef, {
				text: editingWordText.trim(),
				updatedAt: serverTimestamp()
			});
			
			editingWordId = null;
			editingWordText = '';
		} catch (error) {
			console.error('Error updating word:', error);
			alert('낱말 수정에 실패했습니다.');
		}
	}

	// 낱말 편집 취소
	function cancelWordEdit() {
		editingWordId = null;
		editingWordText = '';
	}

	// 문장 편집 시작
	function startEditingSentence(sentenceId: string, currentText: string) {
		editingSentenceId = sentenceId;
		editingSentenceText = currentText;
	}

	// 문장 편집 저장
	async function saveSentenceEdit() {
		if (!editingSentenceId || !editingSentenceText.trim()) return;
		
		try {
			const sentenceRef = doc(db, `classrooms/${classData.id}/sentences`, editingSentenceId);
			await updateDoc(sentenceRef, {
				text: editingSentenceText.trim(),
				updatedAt: serverTimestamp()
			});
			
			editingSentenceId = null;
			editingSentenceText = '';
		} catch (error) {
			console.error('Error updating sentence:', error);
			alert('문장 수정에 실패했습니다.');
		}
	}

	// 문장 편집 취소
	function cancelSentenceEdit() {
		editingSentenceId = null;
		editingSentenceText = '';
	}

	// 이미지 재생성
	async function regenerateImages() {
		if (confirm('새로운 이미지로 교체하시겠습니까?')) {
			try {
				isGeneratingImages = true;
				const generateImagesFn = httpsCallable(functions, 'generateImages');
				
				await generateImagesFn({ classId: classData.id });
				
				alert('새로운 이미지가 생성되었습니다.');
			} catch (error) {
				console.error('Error regenerating images:', error);
				alert('이미지 재생성에 실패했습니다.');
			} finally {
				isGeneratingImages = false;
			}
		}
	}

	// 레슨 생성
	async function createLesson() {
		if (!newLessonTitle.trim()) {
			alert('레슨 제목을 입력해주세요.');
			return;
		}

		try {
			const lessonData = {
				classId: classData.id,
				title: newLessonTitle.trim(),
				description: newLessonDescription.trim(),
				type: newLessonType,
				status: 'draft', // draft, active, completed
				createdAt: serverTimestamp(),
				createdBy: auth.currentUser?.uid,
				creatorName: auth.currentUser?.displayName || '선생님',
				participants: [],
				activityData: {
					currentPhase: 'waiting',
					sharedImages: null,
					wordSubmissions: 0,
					sentenceSubmissions: 0
				}
			};

			const lessonsRef = collection(db, 'lessons');
			const docRef = await addDoc(lessonsRef, lessonData);
			
			// Reset form
			newLessonTitle = '';
			newLessonDescription = '';
			newLessonType = 'creative_writing';
			isCreatingLesson = false;
			
			alert('수업이 성공적으로 생성되었습니다.');
		} catch (error) {
			console.error('Error creating lesson:', error);
			alert('수업 생성에 실패했습니다.');
		}
	}

	// 레슨 삭제
	async function deleteLesson(lessonId: string) {
	if (confirm('이 수업을 삭제하시겠습니까? 모든 데이터가 사라집니다.')) {
			try {
				await deleteDoc(doc(db, 'lessons', lessonId));
			} catch (error) {
				console.error('Error deleting lesson:', error);
				alert('수업 삭제에 실패했습니다.');
			}
		}
	}

	// 래슨 상태 변경
	async function updateLessonStatus(lessonId: string, status: string) {
		try {
			const lessonRef = doc(db, 'lessons', lessonId);
			await updateDoc(lessonRef, {
				status,
				updatedAt: serverTimestamp()
			});
		} catch (error) {
			console.error('Error updating lesson status:', error);
			alert('수업 상태 업데이트에 실패했습니다.');
		}
	}

	// 레슨으로 이동
	function goToLesson(lessonId: string) {
		goto(`/lessons/${lessonId}`);
	}

	// 뒤로가기
	function goBack() {
		goto('/dashboard');
	}

	// 낱말 카운트 계산
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
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="min-h-screen bg-gray-100 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="max-w-7xl mx-auto space-y-6">
		<!-- 헤더 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex justify-between items-center">
				<div class="flex-1">
					<button 
						on:click={goBack}
						class="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-2"
					>
						← 대시보드로 돌아가기
					</button>
					
					{#if isEditingClass}
						<div class="space-y-3">
							<input 
								bind:value={editedClassName}
								class="text-3xl font-bold text-gray-800 bg-transparent border-b-2 border-indigo-300 focus:border-indigo-500 outline-none w-full"
								placeholder="클래스명 입력..."
							>
							<textarea 
								bind:value={editedClassDescription}
								class="text-sm text-gray-600 bg-transparent border border-gray-300 rounded p-2 w-full resize-none"
								rows="2"
								placeholder="클래스 설명 입력... (선택사항)"
							></textarea>
							<div class="flex gap-2">
								<button 
									on:click={updateClassInfo}
									class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
								>
									✓ 저장
								</button>
								<button 
									on:click={cancelClassEdit}
									class="bg-gray-500 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded"
								>
									✕ 취소
								</button>
							</div>
						</div>
					{:else}
						<div class="flex items-start justify-between">
							<div>
								<h1 class="text-3xl font-bold text-gray-800">{classData.className}</h1>
								{#if classData.description}
									<p class="text-sm text-gray-600 mt-1">{classData.description}</p>
								{/if}
							</div>
							<button 
								on:click={() => isEditingClass = true}
								class="text-gray-500 hover:text-gray-700 p-1"
								title="클래스 정보 수정"
							>
								✏️
							</button>
						</div>
					{/if}
					
					<div class="flex items-center gap-4 mt-3">
						<span class="text-sm text-gray-500">참여 코드: 
							<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
								{classData.joinCode}
							</span>
						</span>
						<span class="text-sm px-3 py-1 rounded-full {phases[currentPhase]?.color === 'gray' ? 'bg-gray-100 text-gray-600' : phases[currentPhase]?.color === 'blue' ? 'bg-blue-100 text-blue-600' : phases[currentPhase]?.color === 'green' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}">
							{phases[currentPhase]?.name || '알 수 없음'}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 활동 제어판 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold text-gray-800 mb-4">🎮 활동 제어</h2>
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
					<button 
						on:click={resetActivity}
						class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
					>
						🔄 활동 초기화
					</button>
				{/if}
			</div>
		</div>

		<!-- 레슨 관리 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-bold text-gray-800">📚 수업 관리 ({lessons.length}개 레슨)</h2>
				<button 
					on:click={() => isCreatingLesson = !isCreatingLesson}
					class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
				>
					{#if isCreatingLesson}
						✖ 취소
					{:else}
						➕ 새 수업 만들기
					{/if}
				</button>
			</div>

			<!-- 레슨 생성 폼 -->
			{#if isCreatingLesson}
				<div class="bg-gray-50 rounded-lg p-4 mb-4 border">
					<div class="space-y-3">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">수업 제목</label>
							<input 
								bind:value={newLessonTitle}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
								placeholder="예: 계절에 대한 창의적 글쓰기"
							>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">수업 설명</label>
							<textarea 
								bind:value={newLessonDescription}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
								rows="2"
								placeholder="수업의 목표와 내용을 설명해주세요."
							></textarea>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">수업 유형</label>
							<select 
								bind:value={newLessonType}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							>
								<option value="creative_writing">📝 창의적 글쓰기</option>
								<option value="vocabulary_game">🎮 단어 게임</option>
								<option value="discussion">💬 토론 활동</option>
							</select>
						</div>
						<div class="flex gap-2 pt-2">
							<button 
								on:click={createLesson}
								class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
							>
								✓ 수업 생성
							</button>
							<button 
								on:click={() => {
									isCreatingLesson = false;
									newLessonTitle = '';
									newLessonDescription = '';
									newLessonType = 'creative_writing';
								}}
								class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
							>
								✖ 취소
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- 레슨 리스트 -->
			<div class="space-y-3">
				{#if lessons.length === 0}
					<div class="text-center py-8 text-gray-500">
						<p>아직 생성된 수업이 없습니다.</p>
						<p class="text-sm">새 수업을 만들어 학생들과 함께 활동해보세요!</p>
					</div>
				{:else}
					{#each lessons as lesson}
						<div class="border rounded-lg p-4 hover:shadow-sm transition-shadow">
							<div class="flex justify-between items-start">
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-2">
										<h3 class="font-semibold text-gray-800">{lesson.title}</h3>
										<span class="text-xs px-2 py-1 rounded-full {
											lesson.status === 'draft' ? 'bg-gray-100 text-gray-600' :
											lesson.status === 'active' ? 'bg-green-100 text-green-600' :
											'bg-blue-100 text-blue-600'
										}">
											{
												lesson.status === 'draft' ? '준비중' :
												lesson.status === 'active' ? '진행중' :
												'완료'
											}
										</span>
										<span class="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-600">
											{
												lesson.type === 'creative_writing' ? '📝 창의글쓰기' :
												lesson.type === 'vocabulary_game' ? '🎮 단어게임' :
												'💬 토론'
											}
										</span>
									</div>
									{#if lesson.description}
										<p class="text-sm text-gray-600 mb-2">{lesson.description}</p>
									{/if}
									<div class="flex items-center gap-4 text-xs text-gray-500">
										<span>👥 참여자: {lesson.participants?.length || 0}명</span>
										{#if lesson.activityData}
											<span>📝 단어: {lesson.activityData.wordSubmissions || 0}개</span>
											<span>✨ 문장: {lesson.activityData.sentenceSubmissions || 0}개</span>
										{/if}
									</div>
								</div>
								<div class="flex gap-2">
									{#if lesson.status === 'draft'}
										<button 
											on:click={() => updateLessonStatus(lesson.id, 'active')}
											class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
										>
											▶ 시작
										</button>
									{:else if lesson.status === 'active'}
										<button 
											on:click={() => updateLessonStatus(lesson.id, 'completed')}
											class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
										>
											⏸ 완료
										</button>
									{/if}
									<button 
										on:click={() => goToLesson(lesson.id)}
										class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded"
									>
										📄 열기
									</button>
									<button 
										on:click={() => deleteLesson(lesson.id)}
										class="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
									>
										🗑️ 삭제
									</button>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- 메인 콘텐츠 그리드 -->
		<div class="grid lg:grid-cols-2 gap-6">
			<!-- 왼쪽: 이미지 및 AI 도우미 -->
			<div class="space-y-6">
				<!-- 공유 이미지 -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex justify-between items-center mb-4">
						<h3 class="text-lg font-bold text-gray-800">🖼️ 활동 이미지</h3>
						{#if sharedImages && currentPhase !== 'waiting'}
							<button 
								on:click={regenerateImages}
								disabled={isGeneratingImages}
								class="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white text-xs px-2 py-1 rounded"
								title="새로운 이미지 생성"
							>
								{#if isGeneratingImages}
									<div class="flex items-center gap-1">
										<div class="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
										생성중...
									</div>
								{:else}
									🔄 재생성
								{/if}
							</button>
						{/if}
					</div>
					{#if sharedImages}
						<div class="grid grid-cols-2 gap-4">
							<img src={sharedImages.url1} alt={sharedImages.alt1} class="w-full h-32 object-cover rounded-lg shadow-sm">
							<img src={sharedImages.url2} alt={sharedImages.alt2} class="w-full h-32 object-cover rounded-lg shadow-sm">
						</div>
					{:else}
						<div class="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
							<p class="text-gray-500">활동을 시작하면 이미지가 표시됩니다</p>
						</div>
					{/if}
				</div>

				<!-- AI 도우미 -->
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

			<!-- 오른쪽: 활동 데이터 -->
			<div class="space-y-6">
				<!-- 낱말 구름 -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex justify-between items-center mb-4">
						<h3 class="text-lg font-bold text-gray-800">☁️ 낱말 구름 ({words.length}개)</h3>
					</div>
					{#if words.length === 0}
						<p class="text-gray-500 text-center py-4">아직 제출된 낱말이 없습니다</p>
					{:else}
						<div class="space-y-3">
							{#each words as word}
								<div class="flex items-center justify-between p-2 bg-gray-50 rounded">
									{#if editingWordId === word.id}
										<div class="flex-1 flex gap-2">
											<input 
												bind:value={editingWordText}
												class="flex-1 px-2 py-1 border rounded"
												on:keydown={(e) => e.key === 'Enter' && saveWordEdit()}
											>
											<button 
												on:click={saveWordEdit}
												class="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
											>
												✓
											</button>
											<button 
												on:click={cancelWordEdit}
												class="bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
											>
												✕
											</button>
										</div>
									{:else}
										<div class="flex items-center gap-2">
											<span class="font-medium">{word.text}</span>
											<span class="text-xs text-gray-500">by {word.authorName || '익명'}</span>
										</div>
										<div class="flex gap-1">
											<button 
												on:click={() => startEditingWord(word.id, word.text)}
												class="text-blue-500 hover:text-blue-700 text-sm"
												title="수정"
											>
												✏️
											</button>
											<button 
												on:click={() => deleteWord(word.id)}
												class="text-red-500 hover:text-red-700 text-sm"
												title="삭제"
											>
												🗑️
											</button>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- 문장 피드 -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<h3 class="text-lg font-bold text-gray-800 mb-4">📝 문장 피드 ({sentences.length}개)</h3>
					<div class="max-h-80 overflow-y-auto space-y-3">
						{#if sentences.length === 0}
							<p class="text-gray-500 text-center py-4">아직 제출된 문장이 없습니다</p>
						{:else}
							{#each sentences as sentence}
								<div class="border rounded-lg p-3 bg-gray-50">
									{#if editingSentenceId === sentence.id}
										<div class="space-y-2">
											<textarea 
												bind:value={editingSentenceText}
												class="w-full p-2 border rounded resize-none"
												rows="2"
												on:keydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), saveSentenceEdit())}
											></textarea>
											<div class="flex gap-2">
												<button 
													on:click={saveSentenceEdit}
													class="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
												>
													✓ 저장
												</button>
												<button 
													on:click={cancelSentenceEdit}
													class="bg-gray-500 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
												>
													✕ 취소
												</button>
											</div>
										</div>
									{:else}
										<p class="text-gray-800 mb-2">{sentence.text}</p>
										<div class="flex justify-between items-center text-sm text-gray-500">
											<span>{sentence.authorName || '익명'}</span>
											<div class="flex items-center gap-2">
												<span>❤️ {sentence.likesBy?.length || 0}</span>
												<button 
													on:click={() => startEditingSentence(sentence.id, sentence.text)}
													class="text-blue-500 hover:text-blue-700"
													title="수정"
												>
													✏️
												</button>
												<button 
													on:click={() => deleteSentence(sentence.id)}
													class="text-red-500 hover:text-red-700"
													title="삭제"
												>
													🗑️
												</button>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>