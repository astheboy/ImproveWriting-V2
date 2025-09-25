// 교실 관리 및 학생 목록 Store
import { writable, derived, get } from 'svelte/store';
import { auth, db } from '$lib/firebase/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  limit,
  getDocs
} from 'firebase/firestore';

// =============================================================================
// 교실 관련 Store 정의
// =============================================================================

// 현재 활성 교실 정보
export const currentClassroom = writable(null);

// 교사가 생성한 모든 교실 목록
export const teacherClassrooms = writable([]);

// 교실 생성/관리 상태
export const classroomManagement = writable({
  isCreating: false,
  isLoading: false,
  error: null,
  lastCreatedId: null
});

// 선택된 교실의 수업 목록
export const classroomLessons = writable([]);

// 교실 참여 통계
export const classroomStats = writable({
  totalStudents: 0,
  activeLessons: 0,
  totalSubmissions: 0,
  recentActivity: []
});

// =============================================================================
// Derived Stores
// =============================================================================

// 교실이 활성 상태인지 확인
export const isClassroomActive = derived(
  currentClassroom,
  $classroom => $classroom?.status === 'active'
);

// 교실 수 통계
export const classroomCount = derived(
  teacherClassrooms,
  $classrooms => $classrooms.length
);

// 최근 수업들 (최대 5개)
export const recentLessons = derived(
  classroomLessons,
  $lessons => $lessons.slice(0, 5)
);

// 교실 활동 요약
export const classroomActivity = derived(
  [currentClassroom, classroomStats, classroomLessons],
  ([$classroom, $stats, $lessons]) => ({
    name: $classroom?.name || '교실 없음',
    totalStudents: $stats.totalStudents,
    activeLessons: $lessons.filter(lesson => lesson.status === 'active').length,
    totalLessons: $lessons.length,
    joinCode: $classroom?.joinCode,
    isActive: $classroom?.status === 'active'
  })
);

// =============================================================================
// 실시간 리스너 관리
// =============================================================================

let classroomsUnsubscriber = null;
let lessonsUnsubscriber = null;
let statsUnsubscriber = null;

/**
 * 교사의 교실 목록 실시간 구독
 * @param {string} teacherId - 교사 ID (Firebase UID)
 */
export function subscribeToTeacherClassrooms(teacherId) {
  if (!teacherId) {
    console.warn('teacherId가 제공되지 않았습니다.');
    return () => {};
  }

  // 기존 리스너 정리
  unsubscribeClassroomUpdates();

  try {
    const classroomsRef = collection(db, 'classrooms');
    const classroomsQuery = query(
      classroomsRef,
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );

    classroomsUnsubscriber = onSnapshot(classroomsQuery, (snapshot) => {
      const classrooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      teacherClassrooms.set(classrooms);
      console.log(`📚 교실 목록 업데이트: ${classrooms.length}개`);
      
    }, (error) => {
      console.error('교실 목록 구독 오류:', error);
      classroomManagement.update(state => ({
        ...state,
        error: error.message
      }));
    });

    console.log(`✅ 교사 ${teacherId}의 교실 목록 구독 시작`);

  } catch (error) {
    console.error('교실 목록 구독 설정 오류:', error);
  }

  return unsubscribeClassroomUpdates;
}

/**
 * 특정 교실의 수업 목록 구독
 * @param {string} classroomId - 교실 ID
 */
export function subscribeToClassroomLessons(classroomId) {
  if (!classroomId) {
    console.warn('classroomId가 제공되지 않았습니다.');
    return () => {};
  }

  try {
    // 기존 수업 리스너 정리
    if (lessonsUnsubscriber) {
      lessonsUnsubscriber();
    }

    const lessonsRef = collection(db, 'lessons');
    const lessonsQuery = query(
      lessonsRef,
      where('classroomId', '==', classroomId),
      orderBy('createdAt', 'desc'),
      limit(50) // 최대 50개 수업
    );

    lessonsUnsubscriber = onSnapshot(lessonsQuery, (snapshot) => {
      const lessons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      classroomLessons.set(lessons);
      console.log(`📖 수업 목록 업데이트: ${lessons.length}개`);
      
    }, (error) => {
      console.error('수업 목록 구독 오류:', error);
    });

    console.log(`✅ 교실 ${classroomId}의 수업 목록 구독 시작`);

  } catch (error) {
    console.error('수업 목록 구독 설정 오류:', error);
  }
}

/**
 * 모든 교실 관련 구독 해제
 */
export function unsubscribeClassroomUpdates() {
  if (classroomsUnsubscriber) {
    classroomsUnsubscriber();
    classroomsUnsubscriber = null;
  }
  if (lessonsUnsubscriber) {
    lessonsUnsubscriber();
    lessonsUnsubscriber = null;
  }
  if (statsUnsubscriber) {
    statsUnsubscriber();
    statsUnsubscriber = null;
  }
  
  console.log('🔄 교실 구독 해제됨');
}

// =============================================================================
// 교실 생성 및 관리 액션들
// =============================================================================

/**
 * 새 교실 생성
 * @param {string} name - 교실 이름
 * @param {string} description - 교실 설명 (선택사항)
 * @param {object} settings - 교실 설정
 * @returns {Promise<string>} 생성된 교실 ID
 */
export async function createClassroom(name, description = '', settings = {}) {
  try {
    classroomManagement.update(state => ({
      ...state,
      isCreating: true,
      error: null
    }));

    const user = auth.currentUser;
    if (!user) {
      throw new Error('인증이 필요합니다.');
    }

    // 6자리 참여 코드 생성
    const joinCode = generateJoinCode();

    const classroomData = {
      name: name.trim(),
      description: description.trim(),
      teacherId: user.uid,
      teacherEmail: user.email,
      joinCode,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        allowAnonymous: true,
        maxStudentsPerLesson: 30,
        autoApproveJoin: true,
        ...settings
      }
    };

    // Firestore에 교실 생성
    const classroomRef = await addDoc(collection(db, 'classrooms'), classroomData);
    
    classroomManagement.update(state => ({
      ...state,
      isCreating: false,
      lastCreatedId: classroomRef.id
    }));

    console.log(`🏫 교실 생성됨: ${name} (${joinCode})`);
    
    return classroomRef.id;

  } catch (error) {
    console.error('교실 생성 오류:', error);
    classroomManagement.update(state => ({
      ...state,
      isCreating: false,
      error: error.message
    }));
    throw error;
  }
}

/**
 * 교실 정보 업데이트
 * @param {string} classroomId - 교실 ID
 * @param {object} updates - 업데이트할 정보
 */
export async function updateClassroom(classroomId, updates) {
  try {
    classroomManagement.update(state => ({
      ...state,
      isLoading: true,
      error: null
    }));

    const classroomRef = doc(db, 'classrooms', classroomId);
    await updateDoc(classroomRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // 현재 교실이 업데이트된 교실이면 로컬 업데이트
    const current = get(currentClassroom);
    if (current && current.id === classroomId) {
      currentClassroom.update(classroom => ({
        ...classroom,
        ...updates
      }));
    }

    console.log(`✏️ 교실 업데이트됨: ${classroomId}`);

  } catch (error) {
    console.error('교실 업데이트 오류:', error);
    classroomManagement.update(state => ({
      ...state,
      error: error.message
    }));
    throw error;
    
  } finally {
    classroomManagement.update(state => ({
      ...state,
      isLoading: false
    }));
  }
}

/**
 * 교실 삭제 (비활성화)
 * @param {string} classroomId - 교실 ID
 */
export async function deleteClassroom(classroomId) {
  try {
    classroomManagement.update(state => ({
      ...state,
      isLoading: true,
      error: null
    }));

    const classroomRef = doc(db, 'classrooms', classroomId);
    await updateDoc(classroomRef, {
      status: 'archived',
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 현재 교실이 삭제된 교실이면 초기화
    const current = get(currentClassroom);
    if (current && current.id === classroomId) {
      currentClassroom.set(null);
    }

    console.log(`🗑️ 교실 삭제됨: ${classroomId}`);

  } catch (error) {
    console.error('교실 삭제 오류:', error);
    classroomManagement.update(state => ({
      ...state,
      error: error.message
    }));
    throw error;
    
  } finally {
    classroomManagement.update(state => ({
      ...state,
      isLoading: false
    }));
  }
}

/**
 * 참여 코드 재생성
 * @param {string} classroomId - 교실 ID
 * @returns {Promise<string>} 새로운 참여 코드
 */
export async function regenerateJoinCode(classroomId) {
  try {
    const newJoinCode = generateJoinCode();
    
    await updateClassroom(classroomId, {
      joinCode: newJoinCode
    });

    console.log(`🔄 참여 코드 재생성됨: ${newJoinCode}`);
    return newJoinCode;

  } catch (error) {
    console.error('참여 코드 재생성 오류:', error);
    throw error;
  }
}

// =============================================================================
// 교실 조회 및 선택
// =============================================================================

/**
 * 교실 정보 로드 및 설정
 * @param {string} classroomId - 교실 ID
 */
export async function loadClassroom(classroomId) {
  try {
    classroomManagement.update(state => ({
      ...state,
      isLoading: true,
      error: null
    }));

    const classroomRef = doc(db, 'classrooms', classroomId);
    const classroomDoc = await getDoc(classroomRef);

    if (classroomDoc.exists()) {
      const classroomData = {
        id: classroomDoc.id,
        ...classroomDoc.data()
      };
      
      currentClassroom.set(classroomData);
      
      // 해당 교실의 수업 목록 구독 시작
      subscribeToClassroomLessons(classroomId);
      
      console.log(`📚 교실 로드됨: ${classroomData.name}`);
      
      return classroomData;
    } else {
      throw new Error('교실을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('교실 로드 오류:', error);
    classroomManagement.update(state => ({
      ...state,
      error: error.message
    }));
    throw error;
    
  } finally {
    classroomManagement.update(state => ({
      ...state,
      isLoading: false
    }));
  }
}

/**
 * 참여 코드로 교실 찾기
 * @param {string} joinCode - 참여 코드
 * @returns {Promise<object|null>} 교실 정보 또는 null
 */
export async function findClassroomByJoinCode(joinCode) {
  try {
    const classroomsRef = collection(db, 'classrooms');
    const q = query(
      classroomsRef,
      where('joinCode', '==', joinCode.toUpperCase()),
      where('status', '==', 'active'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }

    return null;

  } catch (error) {
    console.error('교실 찾기 오류:', error);
    throw error;
  }
}

// =============================================================================
// 통계 및 분석
// =============================================================================

/**
 * 교실 통계 업데이트
 * @param {string} classroomId - 교실 ID
 */
export async function updateClassroomStats(classroomId) {
  try {
    // 이 함수는 실제로는 Cloud Functions에서 처리하는 것이 좋지만,
    // 간단한 통계는 클라이언트에서도 계산 가능
    const lessons = get(classroomLessons);
    const activeLessons = lessons.filter(lesson => lesson.status === 'active');
    
    // 기본 통계 업데이트 (실제 학생 수는 별도 계산 필요)
    classroomStats.update(stats => ({
      ...stats,
      activeLessons: activeLessons.length,
      totalLessons: lessons.length
    }));

  } catch (error) {
    console.error('교실 통계 업데이트 오류:', error);
  }
}

// =============================================================================
// 유틸리티 함수들
// =============================================================================

/**
 * 6자리 참여 코드 생성
 * @returns {string} 생성된 참여 코드
 */
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 방지 (I, O, 0, 1 제외)
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 교실 상태 검증
 * @param {object} classroom - 교실 객체
 * @returns {boolean} 유효한 교실 여부
 */
export function isValidClassroom(classroom) {
  return classroom && 
         classroom.id && 
         classroom.name && 
         classroom.teacherId && 
         classroom.joinCode && 
         classroom.status === 'active';
}

/**
 * 교실 관리 권한 확인
 * @param {object} classroom - 교실 객체
 * @param {string} userId - 사용자 ID
 * @returns {boolean} 관리 권한 여부
 */
export function canManageClassroom(classroom, userId) {
  return classroom && classroom.teacherId === userId;
}

// =============================================================================
// 스토어 관리
// =============================================================================

/**
 * 교실 스토어 초기화
 */
export function resetClassroomStore() {
  unsubscribeClassroomUpdates();
  
  currentClassroom.set(null);
  teacherClassrooms.set([]);
  classroomLessons.set([]);
  classroomStats.set({
    totalStudents: 0,
    activeLessons: 0,
    totalSubmissions: 0,
    recentActivity: []
  });
  classroomManagement.set({
    isCreating: false,
    isLoading: false,
    error: null,
    lastCreatedId: null
  });
  
  console.log('🔄 교실 스토어 초기화 완료');
}

/**
 * 현재 교실 정보 조회
 * @returns {object|null} 현재 교실 정보
 */
export function getCurrentClassroom() {
  return get(currentClassroom);
}

/**
 * 교사의 교실 목록 조회
 * @returns {Array} 교실 목록
 */
export function getTeacherClassrooms() {
  return get(teacherClassrooms);
}