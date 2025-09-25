<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { 
		doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, arrayUnion, arrayRemove,
		serverTimestamp, getDoc, setDoc
	} from 'firebase/firestore';
	import { GoogleAuthProvider, signInWithPopup, linkWithCredential, signInAnonymously, getAdditionalUserInfo } from 'firebase/auth';
	import PointsSystem from './PointsSystem.svelte';
	import AdvancedPointsSystem from '$lib/gamification/AdvancedPointsSystem.svelte';

	export let classData: any;
	export let user: any;
	export let lessonId: string | null = null; // 현재 활성 레슨 ID

	let currentPhase = 'waiting';
	let sharedImages: any = null;
	let words: any[] = [];
	let sentences: any[] = [];
	let aiHelper: any = null;
	let unsubscribes: Function[] = [];
	let isLoggingIn = false;
	let loginError = '';
	
	// 포트폴리오 및 포인트 관련 상태
	let userPoints = 0;
	let userLevel = 1;
	let showProfileButton = false; // 프로필 페이지 링크 버튼 표시 여부
	
	// 포인트 시스템 컴포넌트 참조
	let pointsSystemComponent: PointsSystem;
	let advancedPointsSystemComponent: AdvancedPointsSystem;

	// 입력 상태
	let wordInput = '';
	let sentenceInput = '';
	let studentName = '';
	let nameInputShown = false;
	let isSubmitting = false;

	// 사용자 이름 설정
	let displayName = user?.displayName || user?.email || '';
	
	// Google 계정 연동 여부 (익명 사용자만 표시)
	let showLinkAccountButton = user?.isAnonymous;

	onMount(() => {
		// 익명 사용자인 경우 이름 입력 요청
		if (user?.isAnonymous && !displayName) {
			nameInputShown = true;
		}
		
		// Google 로그인 사용자는 프로필 버튼 표시
		showProfileButton = !user?.isAnonymous;
		
		setupRealtimeListeners();
		
		// 사용자 포인트 & 레벨 가져오기
		if (user?.uid) {
			loadUserPointsAndLevel();
		}
	});

	onDestroy(() => {
		unsubscribes.forEach(unsubscribe => unsubscribe());
	});

	// 실시간 리스너 설정
	function setupRealtimeListeners() {
		// lessonId가 없으면 클래스 기반 경로 사용 (하위 호환성)
		const basePath = lessonId ? `lessons/${lessonId}` : `classrooms/${classData.id}`;
		
		// lessonId가 있는 경우 레슨 문서도 구독하여 currentPhase 가져오기
		if (lessonId) {
			const lessonRef = doc(db, 'lessons', lessonId);
			const unsubLesson = onSnapshot(lessonRef, (docSnapshot) => {
				if (docSnapshot.exists()) {
					const lessonData = docSnapshot.data();
					currentPhase = lessonData.activityData?.currentPhase || 'waiting';
					console.log('Updated currentPhase from lesson:', currentPhase);
				} else {
					currentPhase = 'waiting';
				}
			});
			unsubscribes.push(unsubLesson);
		} else {
			// 1. 앱 상태 리스너 (기존 클래스 기반)
			const appStateRef = doc(db, `${basePath}/appState/current`);
			const unsubAppState = onSnapshot(appStateRef, (docSnapshot) => {
				if (docSnapshot.exists()) {
					currentPhase = docSnapshot.data().currentPhase || 'waiting';
				} else {
					currentPhase = 'waiting';
				}
			});
			unsubscribes.push(unsubAppState);
		}

		// 2. 공유 이미지 리스너
		const imageRef = doc(db, `${basePath}/sharedImages/current`);
		const unsubImages = onSnapshot(imageRef, (doc) => {
			if (doc.exists()) {
				sharedImages = doc.data();
				console.log('Received shared images:', sharedImages);
			} else {
				sharedImages = null;
				console.log('No shared images found');
			}
		});
		unsubscribes.push(unsubImages);

		// 3. 낱말 리스너 (낱말 구름용)
		const wordsRef = collection(db, `${basePath}/words`);
		const wordsQuery = query(wordsRef, orderBy('createdAt', 'desc'));
		const unsubWords = onSnapshot(wordsQuery, (snapshot) => {
			words = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			console.log('Updated words:', words.length);
		});
		unsubscribes.push(unsubWords);

		// 4. 문장 리스너 (실시간 피드용)
		const sentencesRef = collection(db, `${basePath}/sentences`);
		const sentencesQuery = query(sentencesRef, orderBy('createdAt', 'desc'));
		const unsubSentences = onSnapshot(sentencesQuery, (snapshot) => {
			sentences = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			console.log('Updated sentences:', sentences.length);
		});
		unsubscribes.push(unsubSentences);

		// 5. AI 도우미 리스너
		const aiRef = doc(db, `${basePath}/aiHelper/current`);
		const unsubAi = onSnapshot(aiRef, (doc) => {
			if (doc.exists()) {
				aiHelper = doc.data();
				console.log('Received AI helper:', aiHelper);
			} else {
				aiHelper = null;
				console.log('No AI helper found');
			}
		});
		unsubscribes.push(unsubAi);
	}

	// 사용자 포인트 & 레벨 로드
	async function loadUserPointsAndLevel() {
		try {
			const userRef = doc(db, `users/${user.uid}`);
			const userDoc = await getDoc(userRef);
			
			if (userDoc.exists()) {
				const userData = userDoc.data();
				userPoints = userData.points || 0;
				userLevel = userData.level || 1;
			} else {
				// 신규 사용자인 경우 초기값 설정
				await setDoc(userRef, {
					points: 0,
					level: 1,
					createdAt: serverTimestamp(),
					isAnonymous: user.isAnonymous
				});
			}
		} catch (error) {
			console.error('포인트 정보 로드 중 오류:', error);
		}
	}
	
	// 이름 설정
	function setStudentName() {
		if (studentName.trim()) {
			displayName = studentName.trim();
			nameInputShown = false;
		}
	}
	
	// 익명 로그인 처리
	async function loginAnonymously() {
		try {
			isLoggingIn = true;
			loginError = '';
			
			const credential = await signInAnonymously(auth);
			console.log('익명 로그인 성공');
			
			// 익명 사용자에게 이름 입력 요청
			nameInputShown = true;
		} catch (error) {
			console.error('익명 로그인 오류:', error);
			loginError = '익명 로그인 중 문제가 발생했습니다. 다시 시도해주세요.';
		} finally {
			isLoggingIn = false;
		}
	}
	
	// Google 로그인 처리
	async function loginWithGoogle() {
		try {
			isLoggingIn = true;
			loginError = '';
			
			const provider = new GoogleAuthProvider();
			const credential = await signInWithPopup(auth, provider);
			
			const isNewUser = getAdditionalUserInfo(credential)?.isNewUser;
			
			if (isNewUser) {
				// 신규 사용자 정보 저장
				const userRef = doc(db, `users/${credential.user.uid}`);
				await setDoc(userRef, {
					displayName: credential.user.displayName,
					email: credential.user.email,
					photoURL: credential.user.photoURL,
					points: 0,
					level: 1,
					createdAt: serverTimestamp(),
					isAnonymous: false
				});
			}
			
			// 프로필 버튼 표시
			showProfileButton = true;
			
			console.log('Google 로그인 성공');
		} catch (error) {
			console.error('Google 로그인 오류:', error);
			loginError = 'Google 로그인 중 문제가 발생했습니다. 다시 시도해주세요.';
		} finally {
			isLoggingIn = false;
		}
	}
	
	// 익명 계정을 Google 계정과 연동
	async function linkWithGoogle() {
		if (!user) return;
		
		try {
			isLoggingIn = true;
			loginError = '';
			
			const provider = new GoogleAuthProvider();
			const result = await signInWithPopup(auth, provider);
			// 2. credentialFromResult는 AuthCredential | null 을 반환할 수 있습니다.
			const credential = GoogleAuthProvider.credentialFromResult(result);
			// 3. credential이 null이 아닌지 확인하여 타입 문제를 해결합니다.
			if (credential) {
				await linkWithCredential(user, credential);
				console.log("계정이 성공적으로 연결되었습니다.");
			} else {
				// credential이 null일 경우의 예외 처리
				throw new Error("Google 로그인 결과에서 인증 정보를 가져올 수 없습니다.");
			}
			// await linkWithCredential(user, GoogleAuthProvider.credentialFromResult(credential));
			
			// 사용자 정보 업데이트
			const userRef = doc(db, `users/${user.uid}`);
			await updateDoc(userRef, {
				displayName: user.displayName,
				email: user.email,
				photoURL: user.photoURL,
				isAnonymous: false,
				updatedAt: serverTimestamp()
			});
			
			// 계정 연동 버튼 숨김 & 프로필 버튼 표시
			showLinkAccountButton = false;
			showProfileButton = true;
			
			console.log('계정 연동 성공');
			alert('계정이 성공적으로 연동되었습니다!');
		} catch (error) {
			console.error('계정 연동 오류:', error);
			loginError = '계정 연동 중 문제가 발생했습니다. 다시 시도해주세요.';
		} finally {
			isLoggingIn = false;
		}
	}
	
	// 포인트 지급 함수 (고급 게임화 시스템 적용)
	async function awardPoints(points: number, reason: string, content?: string, context?: any) {
		if (!user?.uid) {
			console.warn('포인트 지급 실패: 사용자가 로그인되지 않음');
			return false;
		}
		
		try {
			// 고급 포인트 계산 (다양한 보너스 포함)
			let finalPoints = points;
			if (advancedPointsSystemComponent?.calculateAdvancedPoints) {
				finalPoints = await advancedPointsSystemComponent.calculateAdvancedPoints(
					points, 
					reason.includes('낱말') ? 'word' : reason.includes('문장') ? 'sentence' : 'like', 
					content,
					context
				);
			}
			
			const userRef = doc(db, `users/${user.uid}`);
			const userDoc = await getDoc(userRef);
			
			let currentData = { points: 0, level: 1 };
			if (userDoc.exists()) {
				currentData = userDoc.data() as any;
			}
			
			const newPoints = (currentData.points || 0) + finalPoints;
			const oldLevel = currentData.level || 1;
			const newLevel = Math.floor(newPoints / 100) + 1;
			
			// Firestore에 업데이트 (사용자 문서가 없으던 첫 생성 포함)
			if (!userDoc.exists()) {
				// 새 사용자 문서 생성
				await setDoc(userRef, {
					displayName: user?.displayName || '익명',
					email: user?.email || '',
					photoURL: user?.photoURL || '',
					points: newPoints,
					level: newLevel,
					isAnonymous: user?.isAnonymous || false,
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp()
				});
			} else {
				// 기존 사용자 문서 업데이트
				await updateDoc(userRef, {
					points: newPoints,
					level: newLevel,
					updatedAt: serverTimestamp()
				});
			}
			
			// 상태 업데이트
			userPoints = newPoints;
			userLevel = newLevel;
			
			// 포인트 애니메이션 트리거
			if (pointsSystemComponent) {
				pointsSystemComponent.triggerPointsAnimation(finalPoints);
				
				// 레벨업 검사
				if (newLevel > oldLevel) {
					setTimeout(() => {
						pointsSystemComponent.triggerLevelUpAnimation(oldLevel, newLevel);
					}, 1500); // 포인트 애니메이션 후 레벨업
				}
			} else {
				console.warn('포인트 시스템 컴포넌트가 준비되지 않음');
			}
			
			console.log(`✅ ${reason}: ${finalPoints}포인트 획득! (기본 ${points} + 보너스 ${finalPoints - points}) (${currentData.points || 0} -> ${newPoints}, 레벨: ${oldLevel} -> ${newLevel})`);
			return true;
		} catch (error) {
			console.error('❌ 포인트 지급 오류:', error);
			// 사용자에게 시각적 피드백 제공
			alert(`포인트 지급 중 오류가 발생했습니다: ${error}`);
			return false;
		}
	}

	// 낱말 제출
	async function submitWord() {
		if (!wordInput.trim() || isSubmitting) return;
		
		// 필수 조건 검증
		if (!user) {
			alert('로그인이 필요합니다.');
			return;
		}
		
		if (!classData?.id && !lessonId) {
			alert('클래스 또는 레슨 정보가 없습니다.');
			return;
		}

		try {
			isSubmitting = true;
			const basePath = lessonId ? `lessons/${lessonId}` : `classrooms/${classData.id}`;
			const collectionPath = `${basePath}/words`;
			const wordData = {
				text: wordInput.trim(),
				authorId: user.uid,
				authorName: displayName || user.displayName || user.email || '익명',
				createdAt: serverTimestamp(),
				classId: classData?.id || null,
				lessonId: lessonId || null
			};
			
			console.log('🚀 낱말 제출 시도:', {
				collectionPath,
				wordData,
				user: {
					uid: user.uid,
					isAnonymous: user.isAnonymous,
					displayName: user.displayName,
					email: user.email
				},
				classData: {
					id: classData?.id,
					name: classData?.className || classData?.name
				},
				lessonId
			});
			
			// Firestore 연결 테스트를 위한 간단한 읽기 시도
			try {
				const testRef = doc(db, 'users', user.uid);
				await getDoc(testRef);
				console.log('✅ Firestore 연결 확인됨');
			} catch (connectError) {
				console.error('❌ Firestore 연결 오류:', connectError);
				throw new Error('데이터베이스 연결에 문제가 있습니다.');
			}
			
			// 실제 낱말 제출
			const wordsCollection = collection(db, collectionPath);
			const docRef = await addDoc(wordsCollection, wordData);
			
			console.log('✅ 낱말 제출 성공:', {
				docId: docRef.id,
				word: wordInput.trim(),
				collectionPath
			});
			
			// 포인트 지급은 선택사항으로 처리 (실패해도 낱말 제출은 성공)
			try {
				const pointAwarded = await awardPoints(5, '낱말 작성', wordInput.trim(), {
					isEarlyParticipation: false
				});
				if (!pointAwarded) {
					console.warn('낱말 제출은 성공했지만 포인트 지급에 실패했습니다.');
				}
			} catch (pointError) {
				console.warn('포인트 지급 오류 (낱말 제출은 성공):', pointError);
			}
			
			wordInput = '';
			alert('낱말이 성공적으로 제출되었습니다!');
			
		} catch (e) {
			const error = e as { code?: string; message?: string; stack?: string };
			console.error('❌ 낱말 제출 실패:', {
				error,
				errorCode: error?.code,
				errorMessage: error?.message,
				errorStack: error?.stack,
				user: {
					uid: user?.uid,
					isAnonymous: user?.isAnonymous,
					email: user?.email
				},
				classData: {
					id: classData?.id,
					name: classData?.className || classData?.name
				},
				lessonId,
				collectionPath: lessonId ? `lessons/${lessonId}/words` : `classrooms/${classData.id}/words`
			});
			
			// 구체적인 에러 메시지 제공
			let userMessage = '낱말 제출에 실패했습니다. ';
			if (error?.code === 'permission-denied') {
				userMessage += '권한이 없습니다. 로그인을 확인해주세요.';
			} else if (error?.code === 'unavailable') {
				userMessage += '네트워크 연결을 확인해주세요.';
			} else if (error?.message) {
				userMessage += `에러: ${error.message}`;
			} else {
				userMessage += '알 수 없는 오류가 발생했습니다.';
			}
			
			alert(userMessage);
		} finally {
			isSubmitting = false;
		}
	}

	// 문장 제출
	async function submitSentence() {
		if (!sentenceInput.trim() || isSubmitting) return;

		try {
			isSubmitting = true;
			const basePath = lessonId ? `lessons/${lessonId}` : `classrooms/${classData.id}`;
			await addDoc(collection(db, `${basePath}/sentences`), {
				text: sentenceInput.trim(),
				authorName: displayName || '익명',
				authorId: user.uid,
				likesBy: [],
				createdAt: serverTimestamp()
			});
			
			// 문장 작성으로 10 포인트 획득 (콘텐츠와 컴텍스트 포함)
			const pointAwarded = await awardPoints(10, '문장 작성', sentenceInput.trim());
			if (!pointAwarded) {
				console.warn('문장 제출은 성공했지만 포인트 지급에 실패했습니다.');
			}
			
			sentenceInput = '';
			console.log('문장 제출 성공:', sentenceInput.trim());
		} catch (error) {
			console.error('Error submitting sentence:', error);
			alert('문장 제출에 실패했습니다.');
		} finally {
			isSubmitting = false;
		}
	}

	// 공감(좋아요) 클릭 처리 (포인트 지급 포함)
	async function handleLikeClick(sentenceId: string, currentLikes: string[], authorId: string) {
		try {
			const basePath = lessonId ? `lessons/${lessonId}` : `classrooms/${classData.id}`;
			const sentenceRef = doc(db, `${basePath}/sentences`, sentenceId);
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
				
				// 좋아요를 눌르는 사람에게 3포인트 지급
				const likerPointAwarded = await awardPoints(3, '좋아요 누르기');
				if (!likerPointAwarded) {
					console.warn('좋아요는 성공했지만 포인트 지급에 실패했습니다.');
				}
				
				// 좋아요를 받는 작성자에게 5포인트 지급 (다른 사람이 누른 경우)
				if (authorId !== user.uid) {
					try {
						const authorRef = doc(db, `users/${authorId}`);
						const authorDoc = await getDoc(authorRef);
						
						if (authorDoc.exists()) {
							const authorData = authorDoc.data();
							const newPoints = (authorData.points || 0) + 5;
							
							await updateDoc(authorRef, {
								points: newPoints,
								level: Math.floor(newPoints / 100) + 1,
								updatedAt: serverTimestamp()
							});
						}
					} catch (error) {
						console.error('작성자 포인트 지급 오류:', error);
					}
				}
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
	$: wordCounts = words.reduce<Record<string, number>>((acc, word) => {
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

<!-- 로그인 선택 모달 -->
{#if !user}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
			<h2 class="text-2xl font-bold text-gray-800 mb-4 text-center">👋 {classData.className}에 오신 것을 환영합니다!</h2>
			<p class="text-gray-600 mb-6 text-center">참여 방식을 선택해주세요.</p>
			
			<div class="space-y-4">
				<button 
					on:click={loginAnonymously}
					disabled={isLoggingIn}
					class="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-800 font-bold py-4 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
				>
					<span class="text-2xl">👤</span>
					<span>이름만 입력하고 빠르게 참여하기</span>
				</button>
				
				<div class="relative flex items-center py-2">
					<div class="flex-grow border-t border-gray-300"></div>
					<span class="flex-shrink mx-4 text-gray-500">또는</span>
					<div class="flex-grow border-t border-gray-300"></div>
				</div>
				
				<button 
					on:click={loginWithGoogle}
					disabled={isLoggingIn}
					class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
				>
					<span class="text-2xl">🔐</span>
					<span>Google 계정으로 참여하기</span>
				</button>
				
				<p class="text-sm text-gray-600 text-center mt-4">
					Google 계정으로 참여하면 학습 포트폴리오를 관리하고 모든 활동 내역을 저장할 수 있습니다.
				</p>
			</div>
			
			{#if loginError}
				<div class="mt-4 text-red-500 text-center">{loginError}</div>
			{/if}
			
			{#if isLoggingIn}
				<div class="mt-4 text-blue-500 text-center">로그인 중입니다...</div>
			{/if}
		</div>
	</div>
{/if}

<!-- 이름 입력 모달 (익명 로그인 후) -->
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
			
			<div class="mt-4 text-sm text-center text-gray-500">
				언제든지 Google 계정과 연동하여 활동 내역을 저장할 수 있습니다.
			</div>
		</div>
	</div>
{/if}

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="max-w-6xl mx-auto space-y-6">
			<!-- 포인트 시스템 컴포넌트 -->
			<PointsSystem 
				bind:this={pointsSystemComponent}
				currentPoints={userPoints}
				userName={displayName || '익명'}
				on:levelUpModalClosed={() => console.log('레벨업 모달이 닫혔습니다.')}
			/>
			
			<!-- 고급 포인트 시스템 컴포넌트 -->
			<AdvancedPointsSystem 
				bind:this={advancedPointsSystemComponent}
				{user}
				classId={classData.id}
			/>
			
			<!-- 헤더 -->
			<div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6">
				<div class="text-center">
				<h1 class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					{classData.className}
				</h1>
				<p class="text-gray-600 mt-2">안녕하세요, {displayName || '익명'}님! 🌟</p>
				<div class="mt-3 flex flex-wrap items-center justify-center gap-2">
					<span class="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
						{statusMessage}
					</span>
					
					<!-- 포인트 및 레벨 표시 -->
					<span class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
						<span class="text-base">✨</span>
						<span>{userPoints} 포인트</span>
					</span>
					
					<span class="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
						<span class="text-base">🏆</span>
						<span>레벨 {userLevel}</span>
					</span>
				</div>
				
				<!-- 계정 연동 및 프로필 버튼 -->
				<div class="mt-3 flex justify-center gap-2">
					{#if showLinkAccountButton}
						<button 
							on:click={linkWithGoogle}
							class="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
							disabled={isLoggingIn}
						>
							<span class="text-base">🔗</span>
							<span>Google 계정 연동하기</span>
						</button>
					{/if}
					
					{#if showProfileButton}
						<a 
							href="/student/portfolio/{user.uid}"
							class="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
						>
							<span class="text-base">👤</span>
							<span>내 포트폴리오 보기</span>
						</a>
					{/if}
				</div>
				
				{#if loginError}
					<div class="mt-2 text-red-500 text-sm">{loginError}</div>
				{/if}
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
										<button type="button" class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-yellow-200 transition-colors"
											on:click={() => wordInput += (wordInput ? ' ' : '') + keyword}>
											{keyword}
										</button>
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
								<button 
									type="button"
									class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-200 transition-all transform hover:scale-105"
									style="font-size: {fontSize}rem; opacity: {opacity}"
									on:click={() => currentPhase === 'sentence_input_active' && (sentenceInput += (sentenceInput ? ' ' : '') + word)}
								>
									{word}
									{#if count > 1}
										<span class="text-xs text-blue-600">({count})</span>
									{/if}
								</button>
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
												on:click={() => handleLikeClick(sentence.id, sentence.likesBy || [], sentence.authorId)}
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