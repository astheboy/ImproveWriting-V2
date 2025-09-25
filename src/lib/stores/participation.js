// 학생 참여 및 제출 관리 Store
import { writable, derived, get } from 'svelte/store';
import { auth, db } from '$lib/firebase/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  getDoc,
  getDocs
} from 'firebase/firestore';

// =============================================================================
// 학생 참여 관련 Store 정의
// =============================================================================

// 현재 학생의 참여 정보
export const currentParticipation = writable(null);

// 현재 학생이 제출한 단어들
export const mySubmittedWords = writable([]);

// 현재 학생이 제출한 문장
export const mySubmittedSentence = writable(null);

// 제출 진행 상태
export const submissionStatus = writable({
  isSubmittingWord: false,
  isSubmittingSentence: false,
  wordSubmissionError: null,
  sentenceSubmissionError: null
});

// 학생 닉네임 (익명 참여시 사용)
export const studentNickname = writable('');

// 학생의 온라인 상태
export const isOnline = writable(true);

// =============================================================================
// Derived Stores
// =============================================================================

// 단어 제출이 가능한 상태인지 확인
export const canSubmitWords = derived(
  [mySubmittedWords, submissionStatus],
  ([$words, $status]) => {
    return !$status.isSubmittingWord && $words.length < 10; // 최대 10개 단어
  }
);

// 문장 제출이 가능한 상태인지 확인
export const canSubmitSentence = derived(
  [mySubmittedSentence, submissionStatus],
  ([$sentence, $status]) => {
    return !$status.isSubmittingSentence && !$sentence;
  }
);

// 현재 제출한 단어 수
export const submittedWordCount = derived(
  mySubmittedWords,
  $words => $words.length
);

// 참여 상태 요약
export const participationSummary = derived(
  [mySubmittedWords, mySubmittedSentence, studentNickname],
  ([$words, $sentence, $nickname]) => ({
    nickname: $nickname || '익명 학생',
    wordCount: $words.length,
    hasSentence: !!$sentence,
    isActive: $words.length > 0 || !!$sentence
  })
);

// =============================================================================
// 수업 참여 액션들
// =============================================================================

/**
 * 수업에 학생으로 참여
 * @param {string} lessonId - 참여할 수업 ID
 * @param {string} nickname - 학생 닉네임 (선택사항)
 * @param {boolean} isAnonymous - 익명 참여 여부
 * @returns {Promise<string>} 참여 ID
 */
export async function joinLesson(lessonId, nickname = '', isAnonymous = true) {
  try {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingWord: true
    }));

    const user = auth.currentUser;
    const participantData = {
      userId: isAnonymous ? null : user?.uid,
      nickname: nickname || `학생${Math.floor(Math.random() * 1000)}`,
      isAnonymous,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      isActive: true
    };

    // 참여자 정보 저장
    const participantRef = await addDoc(
      collection(db, `lessons/${lessonId}/participants`),
      participantData
    );

    const participation = {
      id: participantRef.id,
      lessonId,
      ...participantData
    };

    currentParticipation.set(participation);
    studentNickname.set(participantData.nickname);
    
    console.log(`👋 수업 ${lessonId}에 참여: ${participantData.nickname}`);
    
    // 온라인 상태 업데이트 시작
    startHeartbeat(lessonId, participantRef.id);
    
    return participantRef.id;

  } catch (error) {
    console.error('수업 참여 오류:', error);
    submissionStatus.update(status => ({
      ...status,
      isSubmittingWord: false,
      wordSubmissionError: error.message
    }));
    throw error;
  }
}

/**
 * 수업에서 나가기
 * @param {string} lessonId - 수업 ID
 * @param {string} participantId - 참여자 ID
 */
export async function leaveLesson(lessonId, participantId) {
  try {
    if (!participantId) return;

    // 참여자 상태를 비활성으로 변경
    const participantRef = doc(db, `lessons/${lessonId}/participants`, participantId);
    await updateDoc(participantRef, {
      isActive: false,
      leftAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });

    // 하트비트 중지
    stopHeartbeat();

    // 스토어 초기화
    resetParticipationStore();
    
    console.log('👋 수업에서 나갔습니다');

  } catch (error) {
    console.error('수업 나가기 오류:', error);
  }
}

// =============================================================================
// 단어 제출 관련 액션들
// =============================================================================

/**
 * 단어 제출
 * @param {string} lessonId - 수업 ID
 * @param {string} word - 제출할 단어
 * @param {string} participantId - 참여자 ID
 */
export async function submitWord(lessonId, word, participantId) {
  try {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingWord: true,
      wordSubmissionError: null
    }));

    const participation = get(currentParticipation);
    const wordData = {
      word: word.trim(),
      studentId: participantId,
      studentNickname: participation?.nickname || '익명 학생',
      createdAt: serverTimestamp(),
      lessonId
    };

    // Firestore에 단어 추가
    const wordRef = await addDoc(
      collection(db, `lessons/${lessonId}/words`),
      wordData
    );

    // 로컬 스토어 업데이트
    mySubmittedWords.update(words => [
      ...words,
      { id: wordRef.id, ...wordData }
    ]);

    console.log(`💡 단어 제출됨: ${word}`);
    
  } catch (error) {
    console.error('단어 제출 오류:', error);
    submissionStatus.update(status => ({
      ...status,
      wordSubmissionError: error.message
    }));
    throw error;
    
  } finally {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingWord: false
    }));
  }
}

/**
 * 제출한 단어 삭제
 * @param {string} lessonId - 수업 ID
 * @param {string} wordId - 삭제할 단어 ID
 */
export async function deleteWord(lessonId, wordId) {
  try {
    await deleteDoc(doc(db, `lessons/${lessonId}/words`, wordId));
    
    // 로컬 스토어에서 제거
    mySubmittedWords.update(words => 
      words.filter(word => word.id !== wordId)
    );

    console.log(`🗑️ 단어 삭제됨: ${wordId}`);
    
  } catch (error) {
    console.error('단어 삭제 오류:', error);
    throw error;
  }
}

// =============================================================================
// 문장 제출 관련 액션들
// =============================================================================

/**
 * 문장 제출
 * @param {string} lessonId - 수업 ID
 * @param {string} sentence - 제출할 문장
 * @param {Array} usedWords - 사용한 단어들
 * @param {string} participantId - 참여자 ID
 */
export async function submitSentence(lessonId, sentence, usedWords = [], participantId) {
  try {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingSentence: true,
      sentenceSubmissionError: null
    }));

    const participation = get(currentParticipation);
    const sentenceData = {
      sentence: sentence.trim(),
      usedWords,
      studentId: participantId,
      studentNickname: participation?.nickname || '익명 학생',
      createdAt: serverTimestamp(),
      lessonId,
      wordCount: sentence.trim().split(/\s+/).length
    };

    // Firestore에 문장 추가
    const sentenceRef = await addDoc(
      collection(db, `lessons/${lessonId}/sentences`),
      sentenceData
    );

    // 로컬 스토어 업데이트
    mySubmittedSentence.set({
      id: sentenceRef.id,
      ...sentenceData
    });

    console.log(`📝 문장 제출됨: ${sentence.substring(0, 50)}...`);
    
  } catch (error) {
    console.error('문장 제출 오류:', error);
    submissionStatus.update(status => ({
      ...status,
      sentenceSubmissionError: error.message
    }));
    throw error;
    
  } finally {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingSentence: false
    }));
  }
}

/**
 * 제출한 문장 수정
 * @param {string} lessonId - 수업 ID
 * @param {string} sentenceId - 문장 ID
 * @param {string} newSentence - 새로운 문장
 * @param {Array} usedWords - 사용한 단어들
 */
export async function editSentence(lessonId, sentenceId, newSentence, usedWords = []) {
  try {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingSentence: true,
      sentenceSubmissionError: null
    }));

    const updateData = {
      sentence: newSentence.trim(),
      usedWords,
      updatedAt: serverTimestamp(),
      wordCount: newSentence.trim().split(/\s+/).length
    };

    // Firestore 업데이트
    await updateDoc(
      doc(db, `lessons/${lessonId}/sentences`, sentenceId),
      updateData
    );

    // 로컬 스토어 업데이트
    mySubmittedSentence.update(sentence => ({
      ...sentence,
      ...updateData
    }));

    console.log(`✏️ 문장 수정됨: ${newSentence.substring(0, 50)}...`);
    
  } catch (error) {
    console.error('문장 수정 오류:', error);
    submissionStatus.update(status => ({
      ...status,
      sentenceSubmissionError: error.message
    }));
    throw error;
    
  } finally {
    submissionStatus.update(status => ({
      ...status,
      isSubmittingSentence: false
    }));
  }
}

// =============================================================================
// 온라인 상태 관리 (Heartbeat)
// =============================================================================

let heartbeatInterval = null;

/**
 * 하트비트 시작 - 온라인 상태 유지
 * @param {string} lessonId - 수업 ID
 * @param {string} participantId - 참여자 ID
 */
function startHeartbeat(lessonId, participantId) {
  // 기존 하트비트 중지
  stopHeartbeat();

  // 30초마다 온라인 상태 업데이트
  heartbeatInterval = setInterval(async () => {
    try {
      const participantRef = doc(db, `lessons/${lessonId}/participants`, participantId);
      await updateDoc(participantRef, {
        lastSeen: serverTimestamp()
      });
      
      isOnline.set(true);
      
    } catch (error) {
      console.error('하트비트 오류:', error);
      isOnline.set(false);
    }
  }, 30000); // 30초

  console.log('💓 하트비트 시작');
}

/**
 * 하트비트 중지
 */
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('💔 하트비트 중지');
  }
}

// =============================================================================
// 데이터 로딩 및 동기화
// =============================================================================

/**
 * 학생의 기존 제출 데이터 로드
 * @param {string} lessonId - 수업 ID
 * @param {string} participantId - 참여자 ID
 */
export async function loadStudentSubmissions(lessonId, participantId) {
  try {
    // 제출한 단어들 로드
    const wordsQuery = query(
      collection(db, `lessons/${lessonId}/words`),
      where('studentId', '==', participantId),
      orderBy('createdAt', 'desc')
    );

    const wordsSnapshot = await getDocs(wordsQuery);
    const words = wordsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    mySubmittedWords.set(words);

    // 제출한 문장 로드
    const sentencesQuery = query(
      collection(db, `lessons/${lessonId}/sentences`),
      where('studentId', '==', participantId),
      orderBy('createdAt', 'desc')
    );

    const sentencesSnapshot = await getDocs(sentencesQuery);
    if (!sentencesSnapshot.empty) {
      const sentenceDoc = sentencesSnapshot.docs[0];
      mySubmittedSentence.set({
        id: sentenceDoc.id,
        ...sentenceDoc.data()
      });
    }

    console.log(`📚 학생 제출 데이터 로드됨: 단어 ${words.length}개, 문장 ${sentencesSnapshot.size}개`);
    
  } catch (error) {
    console.error('학생 데이터 로드 오류:', error);
  }
}

// =============================================================================
// 스토어 관리
// =============================================================================

/**
 * 참여 스토어 초기화
 */
export function resetParticipationStore() {
  currentParticipation.set(null);
  mySubmittedWords.set([]);
  mySubmittedSentence.set(null);
  submissionStatus.set({
    isSubmittingWord: false,
    isSubmittingSentence: false,
    wordSubmissionError: null,
    sentenceSubmissionError: null
  });
  studentNickname.set('');
  isOnline.set(true);
  
  stopHeartbeat();
  
  console.log('🔄 참여 스토어 초기화 완료');
}

/**
 * 현재 참여 정보 조회
 * @returns {object|null} 현재 참여 정보
 */
export function getCurrentParticipation() {
  return get(currentParticipation);
}

/**
 * 학생의 활동 요약 정보
 * @returns {object} 활동 요약
 */
export function getActivitySummary() {
  const words = get(mySubmittedWords);
  const sentence = get(mySubmittedSentence);
  const nickname = get(studentNickname);
  
  return {
    nickname: nickname || '익명 학생',
    wordCount: words.length,
    hasSentence: !!sentence,
    totalActivity: words.length + (sentence ? 1 : 0),
    isActive: words.length > 0 || !!sentence
  };
}