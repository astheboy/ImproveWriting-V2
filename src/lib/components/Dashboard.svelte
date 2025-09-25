<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase/firebase';
	import { signOut } from 'firebase/auth';
	import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, limit } from 'firebase/firestore';
	import { goto } from '$app/navigation';
	import QRCode from 'qrcode';
	import { browser } from '$app/environment';
	import ClassManagement from './ClassManagement.svelte';
	// UI Components
	import { Button, Modal, ModalHeader, ModalContent, ModalFooter, ConfirmDialog, TextInput, Textarea } from '$lib/components/ui';

	// 사용자 및 기본 상태
	let user: any = null;
	let classrooms: any[] = [];
	let lessons: any[] = [];
	let students: any[] = [];
	let analytics: any = {};
	let isLoading = false;
	
	// 탭 관리
	let activeTab: 'overview' | 'classes' | 'lessons' | 'students' | 'analytics' | 'classDetail' = 'overview';
	let selectedClassForDetail: any = null;
	
	// 모달 상태
	let showQRModal = false;
	let showEditModal = false;
	let showCreateClassModal = false;
	let selectedClass: any = null;
	let editingClass: any = null;
	let qrCodeDataUrl = '';
	
	// 폼 데이터
	let newClassName = '';
	let newClassDescription = '';
	let maxStudents = 50;

	onMount(() => {
		// 사용자 상태 구독
		const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
			if (currentUser) {
				user = currentUser;
				// 모든 데이터 로드
				loadAllData();
			} else {
				goto('/');
			}
		});

		return unsubscribe;
	});

	// 모든 데이터 로드
	function loadAllData() {
		if (!user) return;
		
		loadClassrooms();
		loadLessons();
		loadStudents();
	}
	
	// 반응형 분석 데이터 계산
	$: analytics = (() => {
		try {
			const weekAgo = new Date();
			weekAgo.setDate(weekAgo.getDate() - 7);
			
			const result = {
				totalClasses: classrooms?.length || 0,
				totalLessons: lessons?.length || 0,
				totalStudents: students?.length || 0,
				activeClasses: classrooms?.filter(c => c?.isActive)?.length || 0,
				recentActivity: {
					newClassesThisWeek: classrooms?.filter(c => {
						if (!c?.createdAt) return false;
						try {
							const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
							return date > weekAgo;
						} catch {
							return false;
						}
					})?.length || 0,
					newLessonsThisWeek: lessons?.filter(l => {
						if (!l?.createdAt) return false;
						try {
							const date = l.createdAt.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
							return date > weekAgo;
						} catch {
							return false;
						}
					})?.length || 0,
					newStudentsThisWeek: students?.filter(s => {
						if (!s?.joinedAt && !s?.createdAt) return false;
						try {
							const dateField = s.joinedAt || s.createdAt;
							const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
							return date > weekAgo;
						} catch {
							return false;
						}
					})?.length || 0
				}
			};
			
			console.log('📊 Analytics 업데이트:', result);
			return result;
		} catch (error) {
			console.error('❌ Analytics 계산 오류:', error);
			return {
				totalClasses: 0,
				totalLessons: 0,
				totalStudents: 0,
				activeClasses: 0,
				recentActivity: {
					newClassesThisWeek: 0,
					newLessonsThisWeek: 0,
					newStudentsThisWeek: 0
				}
			};
		}
	})();
	
	// 클래스룸 데이터가 변경될 때마다 학생 데이터 업데이트
	$: if (classrooms && classrooms.length >= 0 && user) {
		setTimeout(() => loadStudents(), 100); // 약간의 딘레이로 무한 루프 방지
	}
	
	// 클래스룸 목록 로드
	function loadClassrooms() {
		if (!user) {
			console.log('❌ loadClassrooms: No user');
			return;
		}

		console.log('🔄 loadClassrooms: Starting for user', user.uid);
		const classroomsRef = collection(db, 'classrooms');
		const q = query(classroomsRef, where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'));
		
		onSnapshot(q, (snapshot) => {
			console.log('📊 loadClassrooms: Snapshot received, docs count:', snapshot.docs.length);
			classrooms = snapshot.docs.map(doc => {
				const data = doc.data();
				console.log('📋 Class loaded:', { id: doc.id, name: data.className, teacherId: data.teacherId });
				return {
					id: doc.id,
					...data
				};
			});
			console.log('✅ loadClassrooms: Updated classrooms array, length:', classrooms.length);
		}, (error) => {
			console.error('❌ loadClassrooms: Error:', error);
		});
	}
	
	// 수업(레슨) 목록 로드
	function loadLessons() {
		if (!user) {
			console.log('❌ loadLessons: No user');
			return;
		}

		console.log('🔄 loadLessons: Starting for user', user.uid);
		const lessonsRef = collection(db, 'lessons');
		const q = query(lessonsRef, where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
		
		onSnapshot(q, (snapshot) => {
			console.log('📚 loadLessons: Snapshot received, docs count:', snapshot.docs.length);
			lessons = snapshot.docs.map(doc => {
				const data = doc.data();
				console.log('📝 Lesson loaded:', { id: doc.id, title: data.lessonName || data.title, classId: data.classId, teacherId: data.teacherId });
				return {
					id: doc.id,
					...data
				};
			});
			console.log('✅ loadLessons: Updated lessons array, length:', lessons.length);
		}, (error) => {
			console.error('❌ loadLessons: Error:', error);
		});
	}
	
	// 학생 데이터 로드
	async function loadStudents() {
		if (!user) {
			console.log('❌ loadStudents: No user');
			return;
		}
		
		try {
			console.log('🔄 loadStudents: Starting for user', user.uid);
			
			// 교사의 모든 클래스 ID 수집
			const classIds = classrooms.map(c => c.id);
			console.log('📋 loadStudents: Available class IDs:', classIds);
			
			if (classIds.length === 0) {
				console.log('🚨 loadStudents: No classes available');
				students = [];
				return;
			}
			
			// 모든 학생 데이터 수집
			const studentsData = [];
			
			// 1. classMembers 컬렉션에서 학생 정보 수집
			for (const classId of classIds) {
				try {
					const membersRef = collection(db, 'classMembers');
					const q = query(membersRef, where('classId', '==', classId));
					const snapshot = await getDocs(q);
					
					console.log(`👥 loadStudents: Found ${snapshot.docs.length} members in class ${classId}`);
					
					snapshot.docs.forEach(doc => {
						const data = doc.data();
						studentsData.push({
							id: doc.id,
							...data,
							className: classrooms.find(c => c.id === classId)?.className || '알 수 없음'
						});
					});
				} catch (classError) {
					console.error(`클래스 ${classId} 학생 로드 오류:`, classError);
				}
			}
			
			// 2. 사용자 컬렉션에서 추가 정보 수집 (익명 사용자 포함)
			try {
				const usersRef = collection(db, 'users');
				const usersSnapshot = await getDocs(usersRef);
				
				console.log(`👤 loadStudents: Found ${usersSnapshot.docs.length} total users`);
				
				usersSnapshot.docs.forEach(userDoc => {
					const userData = userDoc.data();
					// 여기에 필요시 학생 필터링 로직 추가 가능
					if (userData.isAnonymous && !studentsData.find(s => s.userId === userDoc.id)) {
						studentsData.push({
							id: userDoc.id,
							userId: userDoc.id,
							displayName: userData.displayName || '익명',
							email: userData.email || '',
							isAnonymous: userData.isAnonymous,
							className: '미지정',
							joinedAt: userData.createdAt
						});
					}
				});
			} catch (usersError) {
				console.warn('사용자 데이터 로드 오류 (무시됨):', usersError);
			}
			
			console.log(`✅ loadStudents: Total ${studentsData.length} students loaded`);
			students = studentsData;
			
		} catch (error) {
			console.error('❌ loadStudents: 학생 데이터 로드 오류:', error);
			students = [];
		}
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
				description: newClassDescription.trim() || '',
				teacherId: user.uid,
				teacherName: user.displayName || user.email,
				joinCode: joinCode,
				studentCount: 0,
				maxStudents: maxStudents,
				isActive: true,
				allowJoin: true,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
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

			// 폼 초기화
			newClassName = '';
			newClassDescription = '';
			maxStudents = 50;
			showCreateClassModal = false;
			
			alert(`클래스가 성공적으로 생성되었습니다!`);
		} catch (error) {
			console.error('Create class error:', error);
			alert('클래스 생성 중 오류가 발생했습니다: ' + error.message);
		} finally {
			isLoading = false;
		}
	}
	
	// 클래스 편집 시작
	function startEditClass(classroom: any) {
		editingClass = { ...classroom };
		showEditModal = true;
	}
	
	// 클래스 편집 저장
	async function saveEditClass() {
		if (!editingClass || !editingClass.className?.trim()) return;
		
		try {
			isLoading = true;
			
			await updateDoc(doc(db, 'classrooms', editingClass.id), {
				className: editingClass.className.trim(),
				description: editingClass.description?.trim() || '',
				maxStudents: editingClass.maxStudents || 50,
				allowJoin: editingClass.allowJoin ?? true,
				isActive: editingClass.isActive ?? true,
				updatedAt: serverTimestamp()
			});
			
			showEditModal = false;
			editingClass = null;
			alert('클래스 정보가 성공적으로 수정되었습니다.');
		} catch (error) {
			console.error('Edit class error:', error);
			alert('클래스 수정 중 오류가 발생했습니다: ' + error.message);
		} finally {
			isLoading = false;
		}
	}
	
	// 클래스 상태 토글 (활성화/비활성화)
	async function toggleClassStatus(classId: string, currentStatus: boolean) {
		try {
			await updateDoc(doc(db, 'classrooms', classId), {
				isActive: !currentStatus,
				updatedAt: new Date()
			});
		} catch (error) {
			console.error('Toggle class status error:', error);
			alert('클래스 상태 변경 중 오류가 발생했습니다.');
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

	// 클래스 입장 (SPA 내에서 처리)
	function enterClass(classId: string) {
		const classroom = classrooms.find(c => c.id === classId);
		if (classroom) {
			selectedClassForDetail = classroom;
			activeTab = 'classDetail';
			console.log('📚 클래스 상세 보기:', classroom.className);
		} else {
			// 폴백으로 기존 방식 사용
			goto(`/class/${classId}`);
		}
	}
	
	// 클래스 상세보기에서 나가기
	function exitClassDetail() {
		selectedClassForDetail = null;
		activeTab = 'classes';
	}
</script>

<svelte:head>
	<title>교사 대시보드 - 상상력을 펼치는 글쓰기</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="min-h-screen bg-gray-50" style="font-family: 'Noto Sans KR', sans-serif;">
	<div class="w-full max-w-7xl mx-auto">
		<!-- 헤더 -->
		<header class="bg-white shadow-sm border-b">
			<div class="px-6 py-4">
				<div class="flex justify-between items-center">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">
							{user?.displayName || '교사'}님의 대시보드
						</h1>
						<p class="text-gray-500 text-sm">클래스와 수업을 효율적으로 관리하세요</p>
					</div>
					<div class="flex items-center gap-3">
						<Button 
							variant="filled"
							on:click={() => showCreateClassModal = true}
						>
							<span slot="icon">add</span>
							새 클래스
						</Button>
						<Button 
							variant="outlined"
							on:click={handleLogout}
						>
							로그아웃
						</Button>
					</div>
				</div>
			</div>
		</header>

		<!-- 탭 네비게이션 -->
		<nav class="bg-white shadow-sm">
			<div class="px-6">
				<div class="flex space-x-8">
					<button 
						on:click={() => activeTab = 'overview'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						통계 개요
					</button>
					<button 
						on:click={() => activeTab = 'classes'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'classes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						클래스 관리
					</button>
					<button 
						on:click={() => activeTab = 'lessons'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'lessons' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						수업 관리
					</button>
					<button 
						on:click={() => activeTab = 'students'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'students' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						학생 관리
					</button>
					<button 
						on:click={() => activeTab = 'analytics'}
						class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'analytics' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						데이터 분석
					</button>
				</div>
			</div>
		</nav>

		<!-- 콘텐츠 영역 -->
		<div class="p-6">
			<!-- 통계 개요 탭 -->
			{#if activeTab === 'overview'}
				<div class="space-y-6">
					<h2 class="text-2xl font-bold text-gray-900">통계 개요</h2>
					
					<!-- 주요 메트릭 -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div class="bg-white rounded-lg shadow p-6">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
										<span class="text-white text-sm">🏠</span>
									</div>
								</div>
								<div class="ml-4">
									<dt class="text-sm font-medium text-gray-500">전체 클래스</dt>
									<dd class="text-2xl font-bold text-gray-900">{analytics.totalClasses || 0}</dd>
								</div>
							</div>
						</div>
						
						<div class="bg-white rounded-lg shadow p-6">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
										<span class="text-white text-sm">📚</span>
									</div>
								</div>
								<div class="ml-4">
									<dt class="text-sm font-medium text-gray-500">전체 수업</dt>
									<dd class="text-2xl font-bold text-gray-900">{analytics.totalLessons || 0}</dd>
								</div>
							</div>
						</div>
						
						<div class="bg-white rounded-lg shadow p-6">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
										<span class="text-white text-sm">👥</span>
									</div>
								</div>
								<div class="ml-4">
									<dt class="text-sm font-medium text-gray-500">전체 학생</dt>
									<dd class="text-2xl font-bold text-gray-900">{analytics.totalStudents || 0}</dd>
								</div>
							</div>
						</div>
						
						<div class="bg-white rounded-lg shadow p-6">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
										<span class="text-white text-sm">✨</span>
									</div>
								</div>
								<div class="ml-4">
									<dt class="text-sm font-medium text-gray-500">활성 클래스</dt>
									<dd class="text-2xl font-bold text-gray-900">{analytics.activeClasses || 0}</dd>
								</div>
							</div>
						</div>
					</div>
					
					<!-- 최근 활동 -->
					<div class="bg-white rounded-lg shadow">
						<div class="px-6 py-4 border-b border-gray-200">
							<h3 class="text-lg font-medium text-gray-900">최근 활동</h3>
						</div>
						<div class="px-6 py-4">
							<div class="space-y-4">
								{#if classrooms.length > 0}
									{#each classrooms.slice(0, 3) as classroom}
										<div class="flex items-center justify-between py-2">
											<div class="flex items-center space-x-3">
												<div class="flex-shrink-0">
													<div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
														<span class="text-gray-600 text-xs">🏠</span>
													</div>
												</div>
												<div class="flex-1 min-w-0">
													<p class="text-sm font-medium text-gray-900 truncate">
														{classroom.className}
													</p>
													<p class="text-sm text-gray-500">
														학생 {classroom.studentCount || 0}명 • {classroom.isActive ? '활성' : '비활성'}
													</p>
												</div>
											</div>
											<div class="flex-shrink-0">
												<button 
													on:click={() => enterClass(classroom.id)}
													class="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
												>
													입장
												</button>
											</div>
										</div>
									{/each}
								{:else}
									<p class="text-gray-500 text-center py-4">아직 생성된 클래스가 없습니다.</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- 클래스 관리 탭 -->
			{#if activeTab === 'classes'}
				<div class="space-y-6">
					<div class="flex justify-between items-center">
						<h2 class="text-2xl font-bold text-gray-900">클래스 관리</h2>
					</div>
					
					{#if classrooms.length === 0}
						<div class="text-center py-12">
							<div class="text-gray-400 text-6xl mb-4">📚</div>
							<p class="text-gray-500 text-lg">아직 생성된 클래스가 없습니다.</p>
							<p class="text-gray-400 mb-6">새 클래스를 만들어보세요!</p>
							<Button 
								variant="filled"
								size="lg"
								on:click={() => showCreateClassModal = true}
							>
								새 클래스 만들기
							</Button>
						</div>
					{:else}
						<div class="bg-white shadow overflow-hidden sm:rounded-md">
							<ul class="divide-y divide-gray-200">
								{#each classrooms as classroom}
									<li>
										<div class="px-6 py-4 flex items-center justify-between">
											<div class="flex items-center space-x-4">
												<div class="flex-shrink-0">
													<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
														<span class="text-indigo-600 text-lg">🏠</span>
													</div>
												</div>
												<div class="flex-1 min-w-0">
													<div class="flex items-center space-x-2">
														<h3 class="text-lg font-medium text-gray-900">{classroom.className}</h3>
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {classroom.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
															{classroom.isActive ? '활성' : '비활성'}
														</span>
													</div>
													<p class="text-sm text-gray-500">
														참여 코드: <span class="font-mono">{classroom.joinCode}</span> • 
														학생: {classroom.studentCount || 0}/{classroom.maxStudents || 50}명 •
														생성일: {classroom.createdAt ? (classroom.createdAt.toDate ? new Date(classroom.createdAt.toDate()).toLocaleDateString() : new Date(classroom.createdAt).toLocaleDateString()) : '알 수 없음'}
													</p>
													{#if classroom.description}
														<p class="text-sm text-gray-600 mt-1">{classroom.description}</p>
													{/if}
												</div>
											</div>
											<div class="flex items-center space-x-2">
												<button 
													on:click={() => enterClass(classroom.id)}
													class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
												>
													입장
												</button>
												<button 
													on:click={() => startEditClass(classroom)}
													class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium"
												>
													편집
												</button>
												<button 
													on:click={() => showQRCode(classroom)}
													class="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm font-medium"
												>
													QR
												</button>
												<button 
													on:click={() => toggleClassStatus(classroom.id, classroom.isActive)}
													class="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded text-sm font-medium"
												>
													{classroom.isActive ? '비활성화' : '활성화'}
												</button>
												<button 
													on:click={() => deleteClass(classroom.id, classroom.className)}
													class="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-medium"
												>
													삭제
												</button>
											</div>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 수업 관리 탭 -->
			{#if activeTab === 'lessons'}
				<div class="space-y-6">
					<h2 class="text-2xl font-bold text-gray-900">수업 관리</h2>
					
					{#if lessons.length === 0}
						<div class="text-center py-12">
							<div class="text-gray-400 text-6xl mb-4">📚</div>
							<p class="text-gray-500 text-lg">아직 생성된 수업이 없습니다.</p>
							<p class="text-gray-400">클래스에 입장하여 새 수업을 만들어보세요!</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each lessons as lesson}
								<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
									<div class="flex justify-between items-start">
										<div class="flex-1">
											<div class="flex items-center gap-3 mb-2">
												<h3 class="text-lg font-bold text-gray-800">{lesson.lessonName || lesson.title || '제목 없음'}</h3>
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
													lesson.lessonType === 'creative_writing' || lesson.type === 'creative_writing' ? '창의적 글쓰기' :
													lesson.lessonType === 'vocabulary_game' || lesson.type === 'vocabulary_game' ? '단어 게임' :
													lesson.lessonType === 'discussion' || lesson.type === 'discussion' ? '토론 활동' : '일반'
												}</span>
												<span>모드: {
													lesson.lessonMode === 'assignment' || lesson.mode === 'assignment' ? '과제형' : '실시간 제어형'
												}</span>
												<span>클래스: {lesson.className || classrooms.find(c => c.id === lesson.classId)?.className || '알 수 없음'}</span>
												<span>생성일: {lesson.createdAt ? new Date(lesson.createdAt.toDate()).toLocaleDateString() : '알 수 없음'}</span>
											</div>
										</div>
										
										<div class="flex items-center gap-2 ml-4">
											<button 
												on:click={() => goto(`/lessons/${lesson.id}`)}
												class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
											>
												수업 관리
											</button>
											<!-- 클래스 보기 버튼 추가 -->
											{#if lesson.classId}
												<button 
													on:click={() => enterClass(lesson.classId)}
													class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded transition-colors"
													title="해당 클래스로 이동"
												>
													클래스 보기
												</button>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 학생 관리 탭 -->
			{#if activeTab === 'students'}
				<div class="space-y-6">
					<h2 class="text-2xl font-bold text-gray-900">학생 관리</h2>
					
					{#if students.length === 0}
						<div class="text-center py-12">
							<div class="text-gray-400 text-6xl mb-4">👥</div>
							<p class="text-gray-500 text-lg">아직 참여한 학생이 없습니다.</p>
							<p class="text-gray-400">학생들이 클래스에 참여하면 여기에 표시됩니다.</p>
						</div>
					{:else}
						<div class="bg-white shadow overflow-hidden sm:rounded-md">
							<ul class="divide-y divide-gray-200">
								{#each students as student}
									<li>
										<div class="px-6 py-4 flex items-center justify-between">
											<div class="flex items-center space-x-4">
												<div class="flex-shrink-0">
													<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
														<span class="text-blue-600 text-lg">👨‍🎓</span>
													</div>
												</div>
												<div class="flex-1 min-w-0">
													<div class="flex items-center space-x-2">
														<h3 class="text-lg font-medium text-gray-900">{student.displayName || student.name || '이름 없음'}</h3>
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
															옵녬인
														</span>
													</div>
													<p class="text-sm text-gray-500">
														클래스: {student.className} •
														참여일: {student.joinedAt ? new Date(student.joinedAt.toDate()).toLocaleDateString() : '알 수 없음'} •
														학습 회수: {student.sessionCount || 0}회
													</p>
													{#if student.lastActivity}
														<p class="text-sm text-gray-600 mt-1">최근 활동: {new Date(student.lastActivity.toDate()).toLocaleString()}</p>
													{/if}
												</div>
											</div>
											<div class="flex items-center space-x-2">
												<button 
													class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium"
												>
													상세 보기
												</button>
											</div>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 데이터 분석 탭 -->
			{#if activeTab === 'analytics'}
				<div class="space-y-6">
					<h2 class="text-2xl font-bold text-gray-900">데이터 분석</h2>
					
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- 클래스별 통계 -->
						<div class="bg-white rounded-lg shadow p-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">클래스별 통계</h3>
							<div class="space-y-4">
								{#each classrooms as classroom}
									<div class="flex items-center justify-between p-3 bg-gray-50 rounded">
										<div>
											<p class="font-medium text-gray-900">{classroom.className}</p>
											<p class="text-sm text-gray-500">학생 {classroom.studentCount || 0}명</p>
										</div>
										<div class="text-right">
											<p class="text-sm font-medium text-indigo-600">
												수업 {lessons.filter(l => l.classId === classroom.id).length}개
											</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
						
						<!-- 활동 현황 -->
						<div class="bg-white rounded-lg shadow p-6">
							<h3 class="text-lg font-medium text-gray-900 mb-4">활동 현황</h3>
							<div class="space-y-4">
								<div class="flex justify-between items-center">
									<span class="text-gray-600">전체 수업 수</span>
									<span class="font-semibold">{lessons.length}개</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-600">전체 참여 학생</span>
									<span class="font-semibold">{students.length}명</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-600">활성 클래스</span>
									<span class="font-semibold">{classrooms.filter(c => c.isActive).length}개</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-600">평균 학생 수</span>
									<span class="font-semibold">
										{classrooms.length > 0 ? Math.round(students.length / classrooms.length) : 0}명/클래스
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
			
			<!-- 클래스 상세보기 탭 -->
			{#if activeTab === 'classDetail' && selectedClassForDetail}
				<div class="space-y-6">
					<!-- 헤더 및 뒤로 가기 -->
					<div class="flex items-center space-x-4">
						<button 
							on:click={exitClassDetail}
							class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors"
						>
							← 뒤로 가기
						</button>
						<h2 class="text-2xl font-bold text-gray-900">{selectedClassForDetail.className} 관리</h2>
					</div>
					
					<!-- ClassManagement 컴포넌트 -->
					<ClassManagement 
						classId={selectedClassForDetail.id}
						classData={selectedClassForDetail}
						{user}
					/>
				</div>
			{/if}
		</div>
	</div>
	
	<!-- 새 클래스 생성 모달 -->
	<Modal 
		open={showCreateClassModal}
		size="md"
		on:close={() => showCreateClassModal = false}
		closeOnEscape={!isLoading}
		closeOnBackdrop={!isLoading}
		showCloseButton={!isLoading}
	>
		<ModalHeader 
			title="새 클래스 만들기"
			subtitle="학생들과 함께할 새로운 클래스를 생성하세요."
			icon="🏫"
		/>
		
		<form on:submit|preventDefault={createClass}>
			<ModalContent>
				<div class="space-y-4">
					<TextInput
						bind:value={newClassName}
						label="클래스 이름"
						placeholder="예: 6학년 1반 국어 수업"
						required
						disabled={isLoading}
					/>
					
					<Textarea
						bind:value={newClassDescription}
						label="설명 (선택사항)"
						placeholder="클래스에 대한 간단한 설명을 입력하세요."
						rows={3}
						disabled={isLoading}
					/>
					
					<TextInput
						type="number"
						bind:value={maxStudents}
						label="최대 학생 수"
						min="1"
						max="100"
						disabled={isLoading}
					/>
				</div>
			</ModalContent>
			
			<ModalFooter align="between">
				<Button 
					type="button"
					variant="outlined"
					fullWidth
					disabled={isLoading}
					on:click={() => showCreateClassModal = false}
				>
					취소
				</Button>
				<Button 
					type="submit"
					variant="filled"
					fullWidth
					loading={isLoading}
					disabled={!newClassName.trim()}
				>
					클래스 생성
				</Button>
			</ModalFooter>
		</form>
	</Modal>
	
	<!-- 클래스 편집 모달 -->
	{#if showEditModal && editingClass}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
				<div class="text-center mb-6">
					<h3 class="text-2xl font-bold text-gray-800 mb-2">클래스 정보 수정</h3>
					<p class="text-gray-600">클래스 정보를 수정하세요.</p>
				</div>
				
				<form on:submit|preventDefault={saveEditClass} class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" for="edit-class-name">클래스 이름 *</label>
						<input 
							id="edit-class-name"
							type="text" 
							bind:value={editingClass.className}
							placeholder="클래스 이름을 입력하세요"
							disabled={isLoading}
							required
							class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" for="edit-class-description">설명</label>
						<textarea 
							id="edit-class-description"
							bind:value={editingClass.description}
							placeholder="클래스에 대한 간단한 설명"
							disabled={isLoading}
							rows="3"
							class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
						></textarea>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2" for="edit-max-students">최대 학생 수</label>
						<input 
							id="edit-max-students"
							type="number" 
							bind:value={editingClass.maxStudents}
							min="1"
							max="100"
							disabled={isLoading}
							class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						>
					</div>
					
					<div class="flex items-center space-x-4">
						<label class="flex items-center">
							<input 
								type="checkbox" 
								bind:checked={editingClass.isActive}
								disabled={isLoading}
								class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
							>
							<span class="ml-2 text-sm text-gray-700">활성 상태</span>
						</label>
						<label class="flex items-center">
							<input 
								type="checkbox" 
								bind:checked={editingClass.allowJoin}
								disabled={isLoading}
								class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-offset-0 focus:ring-indigo-200 focus:ring-opacity-50"
							>
							<span class="ml-2 text-sm text-gray-700">참여 허용</span>
						</label>
					</div>
					
					<div class="flex gap-3 pt-4">
						<button 
							type="button"
							on:click={() => { showEditModal = false; editingClass = null; }}
							disabled={isLoading}
							class="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
						>
							취소
						</button>
						<button 
							type="submit"
							disabled={isLoading || !editingClass.className?.trim()}
							class="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
						>
							{#if isLoading}
								<div class="flex items-center justify-center">
									<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
									수정중...
								</div>
							{:else}
								수정 완료
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
	
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