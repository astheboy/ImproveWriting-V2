<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, db } from '$lib/firebase/firebase';
	import { 
		collection, query, orderBy, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs
	} from 'firebase/firestore';

	export let classData: any;

	// 수업(레슨) 관련 상태
	let lessons: any[] = [];
	let isCreatingLesson = false;
	let newLessonTitle = '';
	let newLessonDescription = '';
	let newLessonType = 'creative_writing';
	let unsubscribes: Function[] = [];

	onMount(() => {
		setupLessonListener();
	});

	onDestroy(() => {
		unsubscribes.forEach(unsubscribe => unsubscribe());
	});

	// 수업(레슨) 리스너 설정
	function setupLessonListener() {
		const lessonsRef = collection(db, 'lessons');
		
		// 먼저 인덱스가 필요한 복합 쿼리로 시도
		try {
			const lessonsQuery = query(lessonsRef, where('classId', '==', classData.id), orderBy('createdAt', 'desc'));
			const unsubLessons = onSnapshot(lessonsQuery, (snapshot) => {
				lessons = snapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data()
				}));
			}, (error) => {
				// 인덱스가 아직 준비되지 않은 경우 폴백 쿼리 사용
				if (error.code === 'failed-precondition') {
					console.log('Firestore index not ready, using fallback query...');
					useSimpleLessonQuery();
				} else {
					console.error('Lesson query error:', error);
				}
			});
			unsubscribes.push(unsubLessons);
		} catch (error) {
			console.error('Query setup error:', error);
			useSimpleLessonQuery();
		}
	}
	
	// 인덱스 없이도 작동하는 간단한 쿼리 (정렬은 클라이언트에서 수행)
	function useSimpleLessonQuery() {
		const lessonsRef = collection(db, 'lessons');
		const lessonsQuery = query(lessonsRef, where('classId', '==', classData.id));
		const unsubLessons = onSnapshot(lessonsQuery, (snapshot) => {
			lessons = snapshot.docs
				.map(doc => ({
					id: doc.id,
					...doc.data()
				}))
				.sort((a, b) => {
					// 클라이언트에서 정렬 (createdAt이 서버 타임스탬프인 경우)
					const aTime = a.createdAt?.toDate?.() || new Date(0);
					const bTime = b.createdAt?.toDate?.() || new Date(0);
					return bTime - aTime; // 내림차순
				});
		});
		unsubscribes.push(unsubLessons);
	}

	// 새 수업 생성
	async function createLesson() {
		if (!newLessonTitle.trim()) {
			alert('수업 제목을 입력해주세요.');
			return;
		}

		try {
			isCreatingLesson = true;
			
			const lessonData = {
				classId: classData.id,
				title: newLessonTitle.trim(),
				description: newLessonDescription.trim(),
				type: newLessonType,
				status: 'active',
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			};

			await addDoc(collection(db, 'lessons'), lessonData);
			
			// 폼 초기화
			newLessonTitle = '';
			newLessonDescription = '';
			newLessonType = 'creative_writing';
			isCreatingLesson = false;
			
			alert('수업이 성공적으로 생성되었습니다!');
		} catch (error) {
			console.error('Error creating lesson:', error);
			alert('수업 생성에 실패했습니다.');
			isCreatingLesson = false;
		}
	}

	// 수업 삭제 (모든 관련 데이터 포함)
	async function deleteLesson(lessonId: string, lessonTitle: string) {
		if (!confirm(`"${lessonTitle}" 수업을 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n- 수업 활동 데이터 (이미지, 낱말, 문장)\n- 학생 참여 기록\n- AI 도우미 데이터`)) {
			return;
		}

		try {
			console.log(`수업 삭제 시작: ${lessonTitle} (ID: ${lessonId})`);
			
			// 수업의 모든 서브컬렉션 삭제
			const deletePromises = [];
			const subCollections = [
				'sharedImages',
				'words',
				'sentences',
				'aiHelper',
				'participants'
			];
			
			for (const subCollectionName of subCollections) {
				try {
					const subCollectionRef = collection(db, `lessons/${lessonId}/${subCollectionName}`);
					const subCollectionSnapshot = await getDocs(subCollectionRef);
					subCollectionSnapshot.docs.forEach(subDoc => {
						deletePromises.push(deleteDoc(subDoc.ref));
					});
					console.log(`서브컬렉션 ${subCollectionName}: ${subCollectionSnapshot.docs.length}개 문서 삭제 예정`);
				} catch (error) {
					console.log(`서브컬렉션 lessons/${lessonId}/${subCollectionName} 삭제 중 오류 (무시됨):`, error);
				}
			}
			
			// 모든 서브 데이터 삭제 실행
			console.log(`총 ${deletePromises.length}개 서브 데이터 삭제 시작`);
			await Promise.all(deletePromises);
			
			// 수업 문서 자체 삭제
			await deleteDoc(doc(db, 'lessons', lessonId));
			
			console.log('수업 삭제 완료');
			alert('수업이 성공적으로 삭제되었습니다.');
		} catch (error) {
			console.error('수업 삭제 중 오류 발생:', error);
			alert('수업 삭제 중 오류가 발생했습니다: ' + error.message);
		}
	}

	// 수업 상세 페이지로 이동
	function enterLesson(lessonId: string) {
		goto(`/lessons/${lessonId}`);
	}

	// 대시보드로 돌아가기
	function goBackToDashboard() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="min-h-screen bg-gray-100 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="max-w-4xl mx-auto space-y-6">
		<!-- 헤더 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex justify-between items-center">
				<div>
					<button 
						on:click={goBackToDashboard}
						class="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-2"
					>
						← 대시보드로 돌아가기
					</button>
					
					<h1 class="text-3xl font-bold text-gray-800">{classData.className}</h1>
					{#if classData.description}
						<p class="text-sm text-gray-600 mt-1">{classData.description}</p>
					{/if}
					
					<div class="flex items-center gap-4 mt-3">
						<span class="text-sm text-gray-500">참여 코드: 
							<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
								{classData.joinCode}
							</span>
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- 수업 관리 -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex justify-between items-center mb-6">
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

			<!-- 수업 생성 폼 -->
			{#if isCreatingLesson}
				<div class="bg-gray-50 rounded-lg p-4 mb-6 border">
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
								disabled={isCreatingLesson}
								class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg"
							>
								✓ 수업 생성
							</button>
							<button 
								on:click={() => isCreatingLesson = false}
								class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
							>
								취소
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- 수업 목록 -->
			{#if lessons.length === 0}
				<div class="text-center py-12">
					<div class="text-gray-400 text-6xl mb-4">📚</div>
					<p class="text-gray-500 text-lg">아직 생성된 수업이 없습니다.</p>
					<p class="text-gray-400">새 수업을 만들어보세요!</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each lessons as lesson}
						<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
							<div class="flex justify-between items-start">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-2">
										<h3 class="text-lg font-bold text-gray-800">{lesson.title}</h3>
										<span class="text-xs px-2 py-1 rounded-full {
											lesson.status === 'active' ? 'bg-green-100 text-green-800' :
											lesson.status === 'completed' ? 'bg-blue-100 text-blue-800' :
											'bg-gray-100 text-gray-600'
										}">
											{lesson.status === 'active' ? '진행중' : 
											 lesson.status === 'completed' ? '완료' : '준비중'}
										</span>
									</div>
									
									{#if lesson.description}
										<p class="text-sm text-gray-600 mb-3">{lesson.description}</p>
									{/if}
									
									<div class="flex items-center gap-4 text-xs text-gray-500">
										<span>유형: {
											lesson.type === 'creative_writing' ? '창의적 글쓰기' :
											lesson.type === 'vocabulary_game' ? '단어 게임' : '토론 활동'
										}</span>
										<span>생성일: {lesson.createdAt?.toDate?.()?.toLocaleDateString() || '알 수 없음'}</span>
									</div>
								</div>
								
								<div class="flex items-center gap-2 ml-4">
									<button 
										on:click={() => enterLesson(lesson.id)}
										class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
									>
										수업 관리
									</button>
									<button 
										on:click={() => deleteLesson(lesson.id, lesson.title)}
										class="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
										title="수업 삭제"
									>
										🗑️
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</main>