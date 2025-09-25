// 상상력을 펼치는 글쓰기 V2 - 통합 Store 관리
// 모든 스토어를 여기서 export하여 중앙화된 상태 관리 제공

// =============================================================================
// Core Stores Export
// =============================================================================

// 수업 관련 스토어 (실시간 수업 진행 상태)
export {
  // 수업 상태 stores
  currentLesson,
  connectedStudents,
  lessonStep,
  submittedWords,
  submittedSentences,
  lessonSettings,
  userRole,
  
  // Derived stores
  isLessonActive,
  canStudentInteract,
  connectedStudentCount,
  wordCollectionProgress,
  sentenceProgress,
  
  // 수업 제어 액션들
  subscribeToLessonUpdates,
  unsubscribeAll,
  changeStep,
  updateLessonSettings,
  getCurrentLesson,
  getCurrentStep,
  getLessonProgress,
  resetLessonStore
} from './lesson.js';

// 학생 참여 관련 스토어 (개별 학생의 제출 상태)
export {
  // 참여 상태 stores
  currentParticipation,
  mySubmittedWords,
  mySubmittedSentence,
  submissionStatus,
  studentNickname,
  isOnline,
  
  // Derived stores
  canSubmitWords,
  canSubmitSentence,
  submittedWordCount,
  participationSummary,
  
  // 참여 액션들
  joinLesson,
  leaveLesson,
  submitWord,
  deleteWord,
  submitSentence,
  editSentence,
  loadStudentSubmissions,
  resetParticipationStore,
  getCurrentParticipation,
  getActivitySummary
} from './participation.js';

// 교실 관리 스토어 (교사의 교실/수업 관리)
export {
  // 교실 상태 stores
  currentClassroom,
  teacherClassrooms,
  classroomManagement,
  classroomLessons,
  classroomStats,
  
  // Derived stores
  isClassroomActive,
  classroomCount,
  recentLessons,
  classroomActivity,
  
  // 교실 관리 액션들
  subscribeToTeacherClassrooms,
  subscribeToClassroomLessons,
  unsubscribeClassroomUpdates,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  regenerateJoinCode,
  loadClassroom,
  findClassroomByJoinCode,
  updateClassroomStats,
  isValidClassroom,
  canManageClassroom,
  resetClassroomStore,
  getCurrentClassroom,
  getTeacherClassrooms
} from './classroom.js';

// =============================================================================
// 통합 관리 함수들
// =============================================================================

/**
 * 모든 스토어를 초기 상태로 리셋
 * 로그아웃이나 앱 재시작시 사용
 */
export function resetAllStores() {
  resetLessonStore();
  resetParticipationStore();
  resetClassroomStore();
  console.log('🔄 모든 스토어 초기화 완료');
}

/**
 * 수업 관련 스토어들만 초기화
 * 수업 종료시 사용
 */
export function resetLessonStores() {
  resetLessonStore();
  resetParticipationStore();
  console.log('🔄 수업 관련 스토어 초기화 완료');
}

/**
 * 교실 관련 스토어들만 초기화
 * 교실 변경시 사용
 */
export function resetClassroomStores() {
  resetClassroomStore();
  console.log('🔄 교실 관련 스토어 초기화 완료');
}

// =============================================================================
// 스토어 상태 디버깅 헬퍼들
// =============================================================================

/**
 * 현재 모든 스토어의 상태를 콘솔에 출력 (개발용)
 */
export function logAllStoreStates() {
  console.group('📊 현재 스토어 상태');
  
  console.log('🎓 수업 상태:', {
    currentLesson: getCurrentLesson(),
    currentStep: getCurrentStep(),
    lessonProgress: getLessonProgress()
  });
  
  console.log('👨‍🎓 학생 참여:', {
    participation: getCurrentParticipation(),
    activitySummary: getActivitySummary()
  });
  
  console.log('🏫 교실 상태:', {
    currentClassroom: getCurrentClassroom(),
    teacherClassrooms: getTeacherClassrooms()
  });
  
  console.groupEnd();
}

/**
 * 스토어 간 데이터 정합성 검사
 * @returns {object} 검사 결과
 */
export function validateStoreConsistency() {
  const lesson = getCurrentLesson();
  const participation = getCurrentParticipation();
  const classroom = getCurrentClassroom();
  
  const issues = [];
  
  // 수업-교실 연결 검사
  if (lesson && classroom && lesson.classroomId !== classroom.id) {
    issues.push('수업과 교실 ID가 일치하지 않음');
  }
  
  // 참여-수업 연결 검사
  if (participation && lesson && participation.lessonId !== lesson.id) {
    issues.push('참여 정보와 수업 ID가 일치하지 않음');
  }
  
  // 유효성 검사
  if (classroom && !isValidClassroom(classroom)) {
    issues.push('유효하지 않은 교실 상태');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// 스토어 액션 단축키들
// =============================================================================

/**
 * 수업 시작 통합 액션
 * @param {string} lessonId - 수업 ID
 * @param {string} userRole - 사용자 역할 ('teacher' | 'student')
 */
export async function initializeLesson(lessonId, userRole = 'teacher') {
  try {
    // 기존 수업 구독 해제
    unsubscribeAll();
    
    // 역할 설정
    import('./lesson.js').then(module => {
      module.userRole.set(userRole);
    });
    
    // 수업 실시간 구독 시작
    const unsubscribe = subscribeToLessonUpdates(lessonId);
    
    console.log(`🎯 수업 초기화 완료: ${lessonId} (${userRole})`);
    return unsubscribe;
    
  } catch (error) {
    console.error('수업 초기화 오류:', error);
    throw error;
  }
}

/**
 * 교사 대시보드 초기화
 * @param {string} teacherId - 교사 ID
 */
export async function initializeTeacherDashboard(teacherId) {
  try {
    // 기존 구독 해제
    unsubscribeClassroomUpdates();
    
    // 교실 목록 구독 시작
    const unsubscribe = subscribeToTeacherClassrooms(teacherId);
    
    console.log(`👩‍🏫 교사 대시보드 초기화 완료: ${teacherId}`);
    return unsubscribe;
    
  } catch (error) {
    console.error('교사 대시보드 초기화 오류:', error);
    throw error;
  }
}

/**
 * 학생 수업 참여 통합 액션
 * @param {string} lessonId - 수업 ID
 * @param {string} nickname - 학생 닉네임
 * @param {boolean} isAnonymous - 익명 참여 여부
 */
export async function joinLessonAsStudent(lessonId, nickname = '', isAnonymous = true) {
  try {
    // 1. 수업 정보 구독
    subscribeToLessonUpdates(lessonId);
    
    // 2. 학생으로 수업 참여
    const participantId = await joinLesson(lessonId, nickname, isAnonymous);
    
    // 3. 기존 제출 데이터 로드
    await loadStudentSubmissions(lessonId, participantId);
    
    // 4. 사용자 역할을 학생으로 설정
    import('./lesson.js').then(module => {
      module.userRole.set('student');
    });
    
    console.log(`🎒 학생 수업 참여 완료: ${lessonId} (${nickname || '익명'})`);
    return participantId;
    
  } catch (error) {
    console.error('학생 수업 참여 오류:', error);
    throw error;
  }
}

// =============================================================================
// 타입 정의 및 상수들
// =============================================================================

/**
 * 수업 진행 단계 상수
 */
export const LESSON_STEPS = {
  PREPARATION: 'preparation',
  WORD_COLLECTION: 'word_collection', 
  SENTENCE_WRITING: 'sentence_writing',
  SHARING: 'sharing',
  COMPLETED: 'completed'
};

/**
 * 사용자 역할 상수
 */
export const USER_ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student'
};

/**
 * 교실 상태 상수
 */
export const CLASSROOM_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended'
};

/**
 * 수업 상태 상수  
 */
export const LESSON_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// =============================================================================
// 개발용 디버깅 도구들
// =============================================================================

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // 개발 환경에서만 전역 디버깅 함수 노출
  window.debugStores = {
    logAllStates: logAllStoreStates,
    validateConsistency: validateStoreConsistency,
    resetAll: resetAllStores,
    resetLesson: resetLessonStores,
    resetClassroom: resetClassroomStores
  };
  
  console.log('🔧 스토어 디버깅 도구가 window.debugStores에 등록되었습니다.');
}