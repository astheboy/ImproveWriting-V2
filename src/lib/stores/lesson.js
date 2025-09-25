// 실시간 수업 상태 관리 Store
import { writable, derived, get } from 'svelte/store';
import { auth, db } from '$lib/firebase/firebase';
import { 
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

// =============================================================================
// 수업 관련 Store 정의
// =============================================================================

// 현재 활성 수업 정보
export const currentLesson = writable(null);

// 현재 수업에 연결된 학생들
export const connectedStudents = writable([]);

// 수업 진행 단계 ('preparation', 'word_collection', 'sentence_writing', 'sharing', 'completed')
export const lessonStep = writable('preparation');

// 수집된 단어들 (학생들이 제출한)
export const submittedWords = writable([]);

// 제출된 문장들
export const submittedSentences = writable([]);

// 수업 설정 (이미지, 제한시간 등)
export const lessonSettings = writable({
  activityImage: null,
  maxWords: 10,
  timeLimit: 30, // 분
  allowAnonymous: true
});

// 현재 사용자 역할
export const userRole = writable('teacher'); // 'teacher' or 'student'

// =============================================================================
// Derived Stores (computed values)
// =============================================================================

// 수업이 활성화된 상태인지 확인
export const isLessonActive = derived(
  currentLesson, 
  $lesson => $lesson?.status === 'active'
);

// 현재 단계에서 학생이 활동할 수 있는지 확인
export const canStudentInteract = derived(
  [lessonStep, userRole],
  ([$step, $role]) => {
    if ($role !== 'student') return false;
    return $step === 'word_collection' || $step === 'sentence_writing';
  }
);

// 연결된 학생 수
export const connectedStudentCount = derived(
  connectedStudents,
  $students => $students.length
);

// 단어 제출 진행률 (학생 기준)
export const wordCollectionProgress = derived(
  [connectedStudents, submittedWords],
  ([$students, $words]) => {
    if ($students.length === 0) return 0;
    const studentsWithWords = new Set($words.map(w => w.studentId));
    return Math.round((studentsWithWords.size / $students.length) * 100);
  }
);

// 문장 제출 진행률 (학생 기준)
export const sentenceProgress = derived(
  [connectedStudents, submittedSentences],
  ([$students, $sentences]) => {
    if ($students.length === 0) return 0;
    return Math.round(($sentences.length / $students.length) * 100);
  }
);

// =============================================================================
// 실시간 리스너 관리
// =============================================================================

let lessonUnsubscriber = null;
let studentsUnsubscriber = null;
let wordsUnsubscriber = null;
let sentencesUnsubscriber = null;

/**
 * 특정 수업의 실시간 업데이트 구독 시작
 * @param {string} lessonId - 구독할 수업 ID
 * @returns {Function} 구독 해제 함수
 */
export function subscribeToLessonUpdates(lessonId) {
  if (!lessonId) {
    console.warn('lessonId가 제공되지 않았습니다.');
    return () => {};
  }

  // 기존 리스너들 정리
  unsubscribeAll();

  try {
    // 1. 수업 정보 실시간 구독
    const lessonRef = doc(db, 'lessons', lessonId);
    lessonUnsubscriber = onSnapshot(lessonRef, (doc) => {
      if (doc.exists()) {
        const lessonData = { id: doc.id, ...doc.data() };
        currentLesson.set(lessonData);
        lessonStep.set(lessonData.currentStep || 'preparation');
        
        // 수업 설정 업데이트
        lessonSettings.update(settings => ({
          ...settings,
          activityImage: lessonData.activityImage,
          maxWords: lessonData.maxWords || 10,
          timeLimit: lessonData.timeLimit || 30,
          allowAnonymous: lessonData.allowAnonymous ?? true
        }));
      } else {
        currentLesson.set(null);
      }
    }, (error) => {
      console.error('수업 정보 구독 오류:', error);
    });

    // 2. 참여 학생 실시간 구독
    const participantsRef = collection(db, `lessons/${lessonId}/participants`);
    const participantsQuery = query(participantsRef, orderBy('joinedAt', 'desc'));
    
    studentsUnsubscriber = onSnapshot(participantsQuery, (snapshot) => {
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isOnline: doc.data().lastSeen ? 
          (Date.now() - doc.data().lastSeen.toDate().getTime()) < 30000 : false // 30초 이내 활동
      }));
      connectedStudents.set(students);
    }, (error) => {
      console.error('참여 학생 구독 오류:', error);
    });

    // 3. 제출된 단어 실시간 구독
    const wordsRef = collection(db, `lessons/${lessonId}/words`);
    const wordsQuery = query(wordsRef, orderBy('createdAt', 'desc'));
    
    wordsUnsubscriber = onSnapshot(wordsQuery, (snapshot) => {
      const words = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      submittedWords.set(words);
    }, (error) => {
      console.error('단어 구독 오류:', error);
    });

    // 4. 제출된 문장 실시간 구독
    const sentencesRef = collection(db, `lessons/${lessonId}/sentences`);
    const sentencesQuery = query(sentencesRef, orderBy('createdAt', 'desc'));
    
    sentencesUnsubscriber = onSnapshot(sentencesQuery, (snapshot) => {
      const sentences = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      submittedSentences.set(sentences);
    }, (error) => {
      console.error('문장 구독 오류:', error);
    });

    console.log(`✅ 수업 ${lessonId} 실시간 구독 시작`);
    
  } catch (error) {
    console.error('실시간 구독 설정 오류:', error);
  }

  // 구독 해제 함수 반환
  return unsubscribeAll;
}

/**
 * 모든 실시간 구독 해제
 */
export function unsubscribeAll() {
  if (lessonUnsubscriber) {
    lessonUnsubscriber();
    lessonUnsubscriber = null;
  }
  if (studentsUnsubscriber) {
    studentsUnsubscriber();
    studentsUnsubscriber = null;
  }
  if (wordsUnsubscriber) {
    wordsUnsubscriber();
    wordsUnsubscriber = null;
  }
  if (sentencesUnsubscriber) {
    sentencesUnsubscriber();
    sentencesUnsubscriber = null;
  }
  
  // 스토어 초기화
  currentLesson.set(null);
  connectedStudents.set([]);
  lessonStep.set('preparation');
  submittedWords.set([]);
  submittedSentences.set([]);
  
  console.log('🔄 모든 실시간 구독 해제됨');
}

// =============================================================================
// 수업 제어 액션들
// =============================================================================

/**
 * 수업 단계 변경
 * @param {string} lessonId - 수업 ID
 * @param {string} newStep - 새로운 단계
 */
export async function changeStep(lessonId, newStep) {
  try {
    const validSteps = ['preparation', 'word_collection', 'sentence_writing', 'sharing', 'completed'];
    if (!validSteps.includes(newStep)) {
      throw new Error(`유효하지 않은 단계: ${newStep}`);
    }

    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      currentStep: newStep,
      updatedAt: serverTimestamp()
    });

    lessonStep.set(newStep);
    console.log(`📚 수업 단계 변경: ${newStep}`);
    
  } catch (error) {
    console.error('수업 단계 변경 오류:', error);
    throw error;
  }
}

/**
 * 수업 설정 업데이트
 * @param {string} lessonId - 수업 ID
 * @param {object} settings - 업데이트할 설정
 */
export async function updateLessonSettings(lessonId, settings) {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      ...settings,
      updatedAt: serverTimestamp()
    });

    lessonSettings.update(current => ({ ...current, ...settings }));
    console.log('⚙️ 수업 설정 업데이트됨:', settings);
    
  } catch (error) {
    console.error('수업 설정 업데이트 오류:', error);
    throw error;
  }
}

/**
 * 현재 수업 정보 조회
 * @returns {object|null} 현재 수업 정보
 */
export function getCurrentLesson() {
  return get(currentLesson);
}

/**
 * 현재 수업 단계 조회
 * @returns {string} 현재 단계
 */
export function getCurrentStep() {
  return get(lessonStep);
}

/**
 * 수업 진행률 계산 (전체 단계 기준)
 * @returns {number} 진행률 (0-100)
 */
export function getLessonProgress() {
  const currentStep = get(lessonStep);
  const stepProgress = {
    'preparation': 0,
    'word_collection': 25,
    'sentence_writing': 50,
    'sharing': 75,
    'completed': 100
  };
  return stepProgress[currentStep] || 0;
}

// =============================================================================
// 초기화 및 정리
// =============================================================================

/**
 * 스토어 초기 상태로 리셋
 */
export function resetLessonStore() {
  unsubscribeAll();
  lessonSettings.set({
    activityImage: null,
    maxWords: 10,
    timeLimit: 30,
    allowAnonymous: true
  });
  userRole.set('teacher');
  
  console.log('🔄 수업 스토어 초기화 완료');
}