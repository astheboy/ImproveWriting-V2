<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import QRCode from 'qrcode';
	import { browser } from '$app/environment';

	let user: any = null;
	let classrooms: any[] = [];
	let newClassName = '';
	let isLoading = false;
	let showQRModal = false;
	let selectedClass: any = null;
	let qrCodeDataUrl = '';

	onMount(() => {
		// 사용자 상태 구독
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			if (currentUser) {
				user = currentUser;
				loadClassrooms();
			} else {
				goto('/');
			}
		});

		return unsubscribe;
	});

	// 클래스룸 목록 로드
	function loadClassrooms() {
		if (!user) return;

		const classroomsRef = collection(db, 'classrooms');
		const q = query(classroomsRef, where('teacherId', '==', user.uid));
		
		onSnapshot(q, (snapshot) => {
			classrooms = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		});
	}

	// 로그아웃 처리
	async function handleLogout() {
		try {
			await signOut(auth);
			goto('/');
		} catch (error) {
			console.error('Logout error:', error);
		}
	}

		// 새 클래스 생성
	async function createClass() {
		if (!newClassName.trim() || !user || !browser) return;

		try {
			isLoading = true;
			
			// 6자리 랜덤 코드 생성 (기존 호환성)
			const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
			
			console.log('Creating new class:', newClassName.trim());
			
			// 먼저 Firestore에 문서 추가하여 실제 Document ID 획득
			const docRef = await addDoc(collection(db, 'classrooms'), {
				className: newClassName.trim(),
				teacherId: user.uid,
				teacherName: user.displayName || user.email,
				joinCode: joinCode,
				studentCount: 0,
				maxStudents: 50,
				isActive: true,
				allowJoin: true,
				createdAt: new Date()
			});
			
			// 실제 Firestore Document ID를 사용하여 QR 코드 생성
			const actualClassId = docRef.id;
			const qrUrl = `${window.location.origin}/join/${actualClassId}`;
			
			console.log('Generated class ID:', actualClassId);
			console.log('QR URL:', qrUrl);
			
			// QR 코드 생성
			const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
				width: 256,
				margin: 2,
				color: {
					dark: '#1f2937',  // 다크 그레이
					light: '#ffffff' // 화이트
				}
			});
			
			console.log('QR code generated successfully');
			
			// QR 코드 정보를 문서에 업데이트
			await updateDoc(docRef, {
				qrCode: qrUrl,
				qrCodeUrl: qrCodeDataUrl
			});
			
			console.log('Class document updated with QR code');

			newClassName = '';
			alert(`클래스가 성공적으로 생성되었습니다!\n클래스 ID: ${actualClassId}\nQR URL: ${qrUrl}`);
		} catch (error) {
			console.error('Create class error:', error);
			alert('클래스 생성 중 오류가 발생했습니다: ' + error.message);
		} finally {
			isLoading = false;
		}
	}
	
	// QR 코드 모달 열기
	async function showQRCode(classroom: any) {
		selectedClass = classroom;
		
		// QR 코드가 없으면 생성
		if (!classroom.qrCodeUrl && browser) {
			try {
				const qrUrl = `${window.location.origin}/join/${classroom.id}`;
				qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
					width: 256,
					margin: 2,
					color: {
						dark: '#1f2937',
						light: '#ffffff'
					}
				});
			} catch (error) {
				console.error('QR code generation error:', error);
				qrCodeDataUrl = '';
			}
		} else {
			qrCodeDataUrl = classroom.qrCodeUrl || '';
		}
		
		showQRModal = true;
	}
	
	// QR 코드 모달 닫기
	function closeQRModal() {
		showQRModal = false;
		selectedClass = null;
		qrCodeDataUrl = '';
	}
	
	// QR 코드 이미지 다운로드
	function downloadQRCode() {
		if (!qrCodeDataUrl || !selectedClass || !browser) return;
		
		const link = document.createElement('a');
		link.download = `${selectedClass.className}_QR코드.png`;
		link.href = qrCodeDataUrl;
		link.click();
	}
	
	// QR 코드 인쇄
	function printQRCode() {
		if (!qrCodeDataUrl || !browser) return;
		
		const printWindow = window.open('', '_blank');
		printWindow?.document.write(`
			<html>
				<head>
					<title>${selectedClass?.className} QR 코드</title>
					<style>
						body { 
							font-family: 'Noto Sans KR', sans-serif;
							text-align: center;
							padding: 20px;
						}
						h1 { margin-bottom: 20px; }
						img { max-width: 300px; }
						.info { margin-top: 20px; font-size: 14px; color: #666; }
						@media print { 
							body { margin: 0; }
						}
					</style>
				</head>
				<body>
					<h1>${selectedClass?.className}</h1>
					<img src="${qrCodeDataUrl}" alt="QR Code" />
					<div class="info">
						<p>스마트폰으로 QR 코드를 스캔하여 클래스에 참여하세요</p>
						<p>또는 참여 코드: <strong>${selectedClass?.joinCode}</strong></p>
					</div>
				</body>
			</html>
		`);
		printWindow?.document.close();
		printWindow?.print();
	}

	// 클래스 삭제 함수
	async function deleteClass(classId: string, className: string) {
		if (!confirm(`"${className}" 클래스를 삭제하시겠습니까?\n\n⚠️ 주의: 이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n- 클래스의 모든 수업(레슨)\n- 수업 관련 활동 데이터 (이미지, 낱말, 문장)\n- 학생 참여 기록\n- AI 도우미 데이터`)) {
			return;
		}

		try {
			console.log(`클래스 삭제 시작: ${className} (ID: ${classId})`);
			
			// 1. 먼저 해당 클래스의 모든 수업들을 찾아서 삭제
			const lessonsRef = collection(db, 'lessons');
			const lessonsQuery = query(lessonsRef, where('classId', '==', classId));
			const lessonsSnapshot = await getDocs(lessonsQuery);
			
			console.log(`찾은 수업 개수: ${lessonsSnapshot.docs.length}`);
			
			// 각 수업과 관련된 모든 서브컬렉션 삭제
			const deletePromises = [];
			
			for (const lessonDoc of lessonsSnapshot.docs) {
				const lessonId = lessonDoc.id;
				console.log(`수업 삭제 중: ${lessonId}`);
				
				// 수업의 서브컬렉션들 삭제
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
					} catch (error) {
						console.log(`서브컬렉션 lessons/${lessonId}/${subCollectionName} 삭제 중 오류 (무시됨):`, error);
					}
				}
				
				// 수업 문서 자체 삭제
				deletePromises.push(deleteDoc(lessonDoc.ref));
			}

			// 2. 클래스 관련 서브컬렉션들도 삭제
			const classSubCollections = [
				'appState',
				'sharedImages',
				'words',
				'sentences',
				'aiHelper'
			];

			for (const subCollectionName of classSubCollections) {
				try {
					const subCollectionRef = collection(db, `classrooms/${classId}/${subCollectionName}`);
					const subCollectionSnapshot = await getDocs(subCollectionRef);
					subCollectionSnapshot.docs.forEach(subDoc => {
						deletePromises.push(deleteDoc(subDoc.ref));
					});
				} catch (error) {
					console.log(`클래스 서브컬렉션 classrooms/${classId}/${subCollectionName} 삭제 중 오류 (무시됨):`, error);
				}
			}

			// 3. classMembers 컬렉션에서 해당 클래스 멤버들 삭제
			try {
				const membersRef = collection(db, 'classMembers');
				const membersQuery = query(membersRef, where('classId', '==', classId));
				const membersSnapshot = await getDocs(membersQuery);
				membersSnapshot.docs.forEach(memberDoc => {
					deletePromises.push(deleteDoc(memberDoc.ref));
				});
				console.log(`클래스 멤버 ${membersSnapshot.docs.length}개 삭제 예정`);
			} catch (error) {
				console.log('classMembers 삭제 중 오류 (무시됨):', error);
			}

			// 4. 모든 서브 데이터 삭제 실행
			console.log(`총 ${deletePromises.length}개 서브 데이터 삭제 시작`);
			await Promise.all(deletePromises);
			
			// 5. 마지막으로 클래스 문서 자체 삭제
			await deleteDoc(doc(db, 'classrooms', classId));
			
			console.log('클래스 삭제 완료');
			alert('클래스가 성공적으로 삭제되었습니다.');
		} catch (error) {
			console.error('클래스 삭제 중 오류 발생:', error);
			alert('클래스 삭제 중 오류가 발생했습니다: ' + error.message);
		}
	}

	// 클래스 입장
	function enterClass(classId: string) {
		goto(`/class/${classId}`);
	}
</script>

<svelte:head>
	<title>교사 대시보드 - 상상력을 펼치는 글쓰기</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="min-h-screen bg-gray-100 p-4" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6">
		<!-- 헤더 -->
		<div class="flex justify-between items-center border-b pb-4">
			<div>
				<h2 class="text-3xl font-bold text-gray-800">
					{user?.displayName || 'OOO'}님의 대시보드
				</h2>
				<p class="text-gray-600">나의 클래스를 만들고 관리하세요.</p>
			</div>
			<button 
				on:click={handleLogout}
				class="bg-gray-200 hover:bg-gray-300 text-sm text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
			>
				로그아웃
			</button>
		</div>

		<!-- 새 클래스 만들기 -->
		<div class="p-4 bg-gray-50 rounded-lg border">
			<h3 class="text-lg font-bold text-gray-700 mb-2">새 클래스 만들기</h3>
			<div class="flex gap-2">
				<input 
					type="text" 
					bind:value={newClassName}
					placeholder="클래스 이름을 입력하세요"
					disabled={isLoading}
					class="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					on:keypress={(e) => e.key === 'Enter' && createClass()}
				>
				<button 
					on:click={createClass}
					disabled={isLoading || !newClassName.trim()}
					class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
				>
					{#if isLoading}
						<div class="flex items-center">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
							생성중...
						</div>
					{:else}
						추가
					{/if}
				</button>
			</div>
		</div>

		<!-- 클래스 목록 -->
		<div>
			<h3 class="text-xl font-bold text-gray-700 mb-4">내 클래스 목록</h3>
			
			{#if classrooms.length === 0}
				<div class="text-center py-12">
					<div class="text-gray-400 text-6xl mb-4">📚</div>
					<p class="text-gray-500 text-lg">아직 생성된 클래스가 없습니다.</p>
					<p class="text-gray-400">위에서 새 클래스를 만들어보세요!</p>
				</div>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each classrooms as classroom}
						<div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
							<div class="flex justify-between items-start mb-3">
								<h4 class="text-lg font-bold text-gray-800">{classroom.className}</h4>
								<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
									{classroom.joinCode}
								</span>
							</div>
							
							<div class="text-sm text-gray-500 mb-2">
								생성일: {new Date(classroom.createdAt.toDate()).toLocaleDateString()}
							</div>
							
							<div class="text-sm text-gray-500 mb-4">
								👥 참여 학생: {classroom.studentCount || 0}명
							</div>

							<div class="space-y-2">
								<div class="flex gap-2">
									<button 
										on:click={() => enterClass(classroom.id)}
										class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
									>
										클래스 입장
									</button>
									<button 
										on:click={() => navigator.clipboard.writeText(classroom.joinCode)}
										class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-2 px-3 rounded transition-colors"
										title="참여 코드 복사"
									>
										📋
									</button>
								</div>
								<div class="flex gap-2">
									<button 
										on:click={() => showQRCode(classroom)}
										class="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
									>
										<span>📱</span>
										QR 코드 보기
									</button>
									<button 
										on:click={() => deleteClass(classroom.id, classroom.className)}
										class="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
										title="클래스 삭제"
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
	
	<!-- QR 코드 모달 -->
	{#if showQRModal && selectedClass}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
				<div class="text-center">
					<h3 class="text-2xl font-bold text-gray-800 mb-4">
						{selectedClass.className}
					</h3>
					<p class="text-gray-600 mb-6">학생들이 QR 코드를 스캔하여 클래스에 참여할 수 있습니다</p>
					
					{#if qrCodeDataUrl}
						<div class="bg-white p-4 rounded-xl border-2 border-gray-200 mb-6">
							<img 
								src={qrCodeDataUrl} 
								alt="QR Code" 
								class="w-full max-w-[200px] mx-auto"
							>
						</div>
					{:else}
						<div class="bg-gray-100 p-8 rounded-xl mb-6">
							<p class="text-gray-500">QR 코드 생성 중...</p>
						</div>
					{/if}
					
					<div class="text-center mb-6">
						<p class="text-sm text-gray-500 mb-2">또는 참여 코드 입력:</p>
						<span class="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-mono font-bold text-lg">
							{selectedClass.joinCode}
						</span>
					</div>
					
					<div class="flex gap-3">
						<button 
							on:click={downloadQRCode}
							disabled={!qrCodeDataUrl}
							class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-3 rounded-lg transition-colors"
						>
							📥 다운로드
						</button>
						<button 
							on:click={printQRCode}
							disabled={!qrCodeDataUrl}
							class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-3 rounded-lg transition-colors"
						>
							🖨️ 인쇄
						</button>
					</div>
					
					<button 
						on:click={closeQRModal}
						class="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-lg transition-colors"
					>
						닫기
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		font-family: 'Noto Sans KR', sans-serif;
	}
</style>