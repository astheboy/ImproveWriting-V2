<!--
  학생용 수업 참여 및 활동 인터페이스
  - 참여 코드 입력 및 닉네임 설정
  - 단어 제출 (수집 단계)
  - 문장 작성 및 제출 (작성 단계)
  - 다른 학생들의 작품 감상 (공유 단계)
-->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { 
    currentLesson,
    lessonStep,
    submittedWords,
    mySubmittedWords,
    mySubmittedSentence,
    canSubmitWords,
    canSubmitSentence,
    submissionStatus,
    studentNickname,
    participationSummary,
    isOnline,
    LESSON_STEPS,
    joinLessonAsStudent,
    submitWord,
    deleteWord,
    submitSentence,
    editSentence,
    leaveLesson,
    getCurrentParticipation
  } from '$lib/stores';

  const dispatch = createEventDispatcher();

  // Props
  export let mode = 'join'; // 'join' | 'active'

  // 컴포넌트 상태
  let joinCode = '';
  let nickname = '';
  let newWord = '';
  let sentenceText = '';
  let selectedWords = [];
  let showWordDetails = false;
  let showSentenceEditor = false;
  let error = '';
  let isLoading = false;

  // 반응형 상태들
  $: lesson = $currentLesson;
  $: currentStep = $lessonStep;
  $: allWords = $submittedWords;
  $: myWords = $mySubmittedWords;
  $: mySentence = $mySubmittedSentence;
  $: canSubmitWord = $canSubmitWords;
  $: canSubmitNewSentence = $canSubmitSentence;
  $: submitting = $submissionStatus;
  $: myNickname = $studentNickname;
  $: summary = $participationSummary;
  $: online = $isOnline;

  // 현재 참여 정보
  let participation = null;

  // 단계별 제목과 설명
  const stepInfo = {
    [LESSON_STEPS.PREPARATION]: {
      title: '수업 준비 중...',
      description: '선생님이 수업을 준비하고 있습니다. 잠시만 기다려주세요.'
    },
    [LESSON_STEPS.WORD_COLLECTION]: {
      title: '단어 수집하기',
      description: '이미지를 보고 떠오르는 단어들을 자유롭게 입력해보세요!'
    },
    [LESSON_STEPS.SENTENCE_WRITING]: {
      title: '문장 만들기',
      description: '수집된 단어들을 사용하여 창의적인 문장을 만들어보세요.'
    },
    [LESSON_STEPS.SHARING]: {
      title: '작품 감상하기',
      description: '친구들이 만든 멋진 문장들을 감상해보세요.'
    },
    [LESSON_STEPS.COMPLETED]: {
      title: '수업 완료!',
      description: '오늘 수업이 모두 끝났습니다. 수고하셨어요!'
    }
  };

  onMount(() => {
    participation = getCurrentParticipation();
  });

  onDestroy(() => {
    // 컴포넌트 언마운트시 수업에서 나가기
    if (participation) {
      handleLeaveLesson();
    }
  });

  /**
   * 수업 참여하기
   */
  async function handleJoinLesson() {
    if (!joinCode.trim()) {
      error = '참여 코드를 입력해주세요.';
      return;
    }

    try {
      isLoading = true;
      error = '';

      // 수업 찾기 및 참여
      const participantId = await joinLessonAsStudent(
        joinCode.trim().toUpperCase(),
        nickname.trim() || `학생${Math.floor(Math.random() * 1000)}`,
        true
      );

      participation = getCurrentParticipation();
      mode = 'active';
      
      console.log('🎒 수업 참여 완료:', participantId);
      dispatch('joined', { participantId, nickname: nickname.trim() });

    } catch (err) {
      console.error('수업 참여 오류:', err);
      error = `수업 참여에 실패했습니다: ${err.message}`;
      
    } finally {
      isLoading = false;
    }
  }

  /**
   * 수업에서 나가기
   */
  async function handleLeaveLesson() {
    if (!participation) return;

    try {
      await leaveLesson(participation.lessonId, participation.id);
      participation = null;
      mode = 'join';
      
      // 상태 초기화
      joinCode = '';
      nickname = '';
      newWord = '';
      sentenceText = '';
      selectedWords = [];
      error = '';

      dispatch('left');

    } catch (err) {
      console.error('수업 나가기 오류:', err);
    }
  }

  /**
   * 단어 제출
   */
  async function handleSubmitWord() {
    if (!newWord.trim() || !participation) return;

    try {
      await submitWord(participation.lessonId, newWord.trim(), participation.id);
      newWord = '';
      
    } catch (err) {
      console.error('단어 제출 오류:', err);
      error = `단어 제출에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 내가 제출한 단어 삭제
   */
  async function handleDeleteWord(wordId) {
    if (!participation) return;

    try {
      await deleteWord(participation.lessonId, wordId);
      
    } catch (err) {
      console.error('단어 삭제 오류:', err);
      error = `단어 삭제에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 문장 제출
   */
  async function handleSubmitSentence() {
    if (!sentenceText.trim() || !participation) return;

    try {
      await submitSentence(
        participation.lessonId, 
        sentenceText.trim(), 
        selectedWords,
        participation.id
      );
      
      sentenceText = '';
      selectedWords = [];
      showSentenceEditor = false;
      
    } catch (err) {
      console.error('문장 제출 오류:', err);
      error = `문장 제출에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 문장 수정
   */
  async function handleEditSentence() {
    if (!sentenceText.trim() || !mySentence || !participation) return;

    try {
      await editSentence(
        participation.lessonId,
        mySentence.id,
        sentenceText.trim(),
        selectedWords
      );
      
      showSentenceEditor = false;
      
    } catch (err) {
      console.error('문장 수정 오류:', err);
      error = `문장 수정에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 단어 선택/해제 토글
   */
  function toggleWordSelection(word) {
    if (selectedWords.includes(word)) {
      selectedWords = selectedWords.filter(w => w !== word);
    } else {
      selectedWords = [...selectedWords, word];
    }
  }

  /**
   * 문장 편집기 열기
   */
  function openSentenceEditor() {
    if (mySentence) {
      sentenceText = mySentence.sentence || '';
      selectedWords = mySentence.usedWords || [];
    } else {
      sentenceText = '';
      selectedWords = [];
    }
    showSentenceEditor = true;
    error = '';
  }

  /**
   * Enter 키로 단어 제출
   */
  function handleWordKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey && canSubmitWord) {
      event.preventDefault();
      handleSubmitWord();
    }
  }

  /**
   * 고유한 단어 목록 생성 (중복 제거)
   */
  function getUniqueWords() {
    const wordSet = new Set();
    return allWords.filter(wordItem => {
      if (wordSet.has(wordItem.word.toLowerCase())) {
        return false;
      }
      wordSet.add(wordItem.word.toLowerCase());
      return true;
    });
  }
</script>

<style>
  .student-interface {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  .join-form {
    background: white;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .join-title {
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .join-subtitle {
    color: #666;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .form-label {
    display: block;
    font-weight: 500;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 1.1rem;
    transition: border-color 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #4285f4;
  }

  .code-input {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .join-button {
    width: 100%;
    padding: 1rem;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .join-button:hover {
    background: #3367d6;
  }

  .join-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* 활성 수업 인터페이스 */
  .lesson-header {
    background: linear-gradient(135deg, #4285f4, #34a853);
    color: white;
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 2rem;
    position: relative;
    overflow: hidden;
  }

  .lesson-header::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(30px, -30px);
  }

  .lesson-title {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .lesson-subtitle {
    opacity: 0.9;
    margin-bottom: 1rem;
  }

  .student-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .student-avatar {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .student-details h4 {
    margin: 0;
    font-size: 1.1rem;
  }

  .student-details p {
    margin: 0;
    opacity: 0.8;
    font-size: 0.9rem;
  }

  .online-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.online {
    background: #34a853;
  }

  .status-dot.offline {
    background: #ea4335;
  }

  .leave-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .leave-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* 활동 영역 */
  .activity-section {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 2rem;
  }

  .step-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .step-title {
    font-size: 1.6rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .step-description {
    color: #666;
    font-size: 1.1rem;
  }

  /* 이미지 표시 */
  .activity-image {
    text-align: center;
    margin-bottom: 2rem;
  }

  .activity-image img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 12px;
    object-fit: cover;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  /* 단어 수집 */
  .word-input-section {
    margin-bottom: 2rem;
  }

  .word-input-form {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .word-input {
    flex: 1;
    padding: 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 1.1rem;
  }

  .word-submit-button {
    padding: 1rem 1.5rem;
    background: #34a853;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .word-submit-button:hover {
    background: #2d8f47;
  }

  .word-submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .my-words {
    margin-bottom: 2rem;
  }

  .words-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .word-tag {
    background: #e8f0fe;
    color: #1976d2;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
  }

  .word-tag.my-word {
    background: #e8f5e8;
    color: #2e7d32;
  }

  .word-tag.selected {
    background: #4285f4;
    color: white;
  }

  .word-tag.selectable {
    cursor: pointer;
  }

  .word-tag.selectable:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .delete-word-button {
    background: none;
    border: none;
    color: currentColor;
    cursor: pointer;
    padding: 0;
    font-size: 0.9rem;
  }

  /* 문장 작성 */
  .sentence-section {
    margin-top: 2rem;
  }

  .sentence-editor {
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .sentence-textarea {
    width: 100%;
    min-height: 120px;
    border: none;
    outline: none;
    font-size: 1.1rem;
    line-height: 1.6;
    resize: vertical;
  }

  .word-selector {
    margin-bottom: 1.5rem;
  }

  .word-selector h4 {
    margin-bottom: 1rem;
    color: #333;
  }

  .sentence-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .cancel-button {
    padding: 0.75rem 1.5rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .save-button {
    padding: 0.75rem 1.5rem;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .my-sentence-display {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .sentence-text {
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .used-words {
    font-size: 0.9rem;
    color: #666;
  }

  .edit-sentence-button {
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 1rem;
  }

  /* 공유 단계 */
  .sentences-gallery {
    display: grid;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .sentence-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 1.5rem;
    border-left: 4px solid #4285f4;
  }

  .sentence-card.my-sentence {
    border-left-color: #34a853;
    background: #e8f5e8;
  }

  .sentence-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    color: #666;
  }

  .author-name {
    font-weight: 600;
    color: #333;
  }

  /* 에러 메시지 */
  .error-message {
    background: #ffeaea;
    color: #d32f2f;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border-left: 4px solid #d32f2f;
  }

  /* 로딩 상태 */
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #ffffff40;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* 반응형 */
  @media (max-width: 768px) {
    .student-interface {
      padding: 0.5rem;
    }
    
    .join-form, .lesson-header, .activity-section {
      padding: 1.5rem;
    }
    
    .word-input-form {
      flex-direction: column;
    }
    
    .sentence-actions {
      flex-direction: column;
    }
  }
</style>

<div class="student-interface">
  {#if mode === 'join'}
    <!-- 수업 참여 폼 -->
    <div class="join-form">
      <div class="join-title">수업 참여하기</div>
      <div class="join-subtitle">선생님이 알려준 참여 코드를 입력해주세요</div>
      
      <div class="form-group">
        <label class="form-label" for="join-code">참여 코드</label>
        <input 
          id="join-code"
          class="form-input code-input" 
          type="text" 
          bind:value={joinCode}
          placeholder="ABC123"
          maxlength="6"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label" for="nickname">닉네임 (선택사항)</label>
        <input 
          id="nickname"
          class="form-input" 
          type="text" 
          bind:value={nickname}
          placeholder="원하는 닉네임을 입력하세요"
          maxlength="20"
        />
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      
      <button 
        class="join-button" 
        on:click={handleJoinLesson}
        disabled={!joinCode.trim() || isLoading}
      >
        {#if isLoading}
          <div class="loading-spinner"></div>
        {/if}
        수업 참여하기
      </button>
    </div>
    
  {:else if mode === 'active' && lesson}
    <!-- 활성 수업 인터페이스 -->
    <div class="lesson-header">
      <button class="leave-button" on:click={handleLeaveLesson} title="수업 나가기">
        <i class="fas fa-times"></i>
      </button>
      
      <div class="lesson-title">{lesson.title}</div>
      <div class="lesson-subtitle">{lesson.description}</div>
      
      <div class="student-info">
        <div class="student-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="student-details">
          <h4>{myNickname}</h4>
          <p>{summary.wordCount}개 단어, {summary.hasSentence ? '문장 완성' : '문장 미완성'}</p>
        </div>
        <div class="online-status">
          <div class="status-dot {online ? 'online' : 'offline'}"></div>
          <span>{online ? '온라인' : '오프라인'}</span>
        </div>
      </div>
    </div>

    <!-- 활동 영역 -->
    <div class="activity-section">
      <div class="step-header">
        <div class="step-title">{stepInfo[currentStep]?.title || '수업 진행 중'}</div>
        <div class="step-description">{stepInfo[currentStep]?.description || ''}</div>
      </div>

      <!-- 활동 이미지 -->
      {#if lesson.activityImage}
        <div class="activity-image">
          <img src={lesson.activityImage} alt="활동 이미지" />
        </div>
      {/if}

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <!-- 단계별 활동 -->
      {#if currentStep === LESSON_STEPS.PREPARATION}
        <div style="text-align: center; padding: 2rem; color: #666;">
          <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>선생님이 수업을 시작할 때까지 잠시만 기다려주세요.</p>
        </div>

      {:else if currentStep === LESSON_STEPS.WORD_COLLECTION}
        <!-- 단어 수집 단계 -->
        <div class="word-input-section">
          <div class="word-input-form">
            <input 
              class="word-input form-input"
              type="text" 
              bind:value={newWord}
              placeholder="떠오르는 단어를 입력하세요..."
              on:keypress={handleWordKeyPress}
              maxlength="20"
            />
            <button 
              class="word-submit-button"
              on:click={handleSubmitWord}
              disabled={!newWord.trim() || !canSubmitWord || submitting.isSubmittingWord}
            >
              {#if submitting.isSubmittingWord}
                <div class="loading-spinner"></div>
              {:else}
                <i class="fas fa-plus"></i>
                추가
              {/if}
            </button>
          </div>

          {#if myWords.length > 0}
            <div class="my-words">
              <h4>내가 제출한 단어들 ({myWords.length}/{lesson.maxWords || 10})</h4>
              <div class="words-grid">
                {#each myWords as wordItem}
                  <div class="word-tag my-word">
                    {wordItem.word}
                    <button 
                      class="delete-word-button"
                      on:click={() => handleDeleteWord(wordItem.id)}
                      title="삭제"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

      {:else if currentStep === LESSON_STEPS.SENTENCE_WRITING}
        <!-- 문장 작성 단계 -->
        <div class="sentence-section">
          {#if mySentence}
            <!-- 이미 제출한 문장 표시 -->
            <div class="my-sentence-display">
              <div class="sentence-text">{mySentence.sentence}</div>
              {#if mySentence.usedWords?.length > 0}
                <div class="used-words">
                  사용한 단어: {mySentence.usedWords.join(', ')}
                </div>
              {/if}
              <button class="edit-sentence-button" on:click={openSentenceEditor}>
                <i class="fas fa-edit"></i> 문장 수정하기
              </button>
            </div>
          {:else}
            <!-- 문장 작성 버튼 -->
            <button 
              class="join-button" 
              on:click={openSentenceEditor}
              style="margin-bottom: 2rem;"
            >
              <i class="fas fa-pencil-alt"></i>
              문장 만들기
            </button>
          {/if}

          <!-- 문장 편집기 -->
          {#if showSentenceEditor}
            <div class="sentence-editor">
              <textarea 
                class="sentence-textarea"
                bind:value={sentenceText}
                placeholder="수집된 단어들을 활용해서 창의적인 문장을 만들어보세요..."
                maxlength="500"
              ></textarea>
              
              <div class="word-selector">
                <h4>사용할 단어 선택 (선택사항)</h4>
                <div class="words-grid">
                  {#each getUniqueWords() as wordItem}
                    <div 
                      class="word-tag selectable {selectedWords.includes(wordItem.word) ? 'selected' : ''}"
                      role="button"
                      tabindex="0"
                      on:click={() => toggleWordSelection(wordItem.word)}
                      on:keydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleWordSelection(wordItem.word);
                        }
                      }}
                      aria-pressed={selectedWords.includes(wordItem.word)}
                    >
                      {wordItem.word}
                    </div>
                  {/each}
                </div>
              </div>
              
              <div class="sentence-actions">
                <button 
                  class="cancel-button"
                  on:click={() => { showSentenceEditor = false; error = ''; }}
                >
                  취소
                </button>
                <button 
                  class="save-button"
                  on:click={mySentence ? handleEditSentence : handleSubmitSentence}
                  disabled={!sentenceText.trim() || submitting.isSubmittingSentence}
                >
                  {#if submitting.isSubmittingSentence}
                    <div class="loading-spinner"></div>
                  {/if}
                  {mySentence ? '수정 완료' : '문장 제출'}
                </button>
              </div>
            </div>
          {/if}
        </div>

      {:else if currentStep === LESSON_STEPS.SHARING}
        <!-- 작품 공유 단계 -->
        <div class="sentences-gallery">
          {#each $submittedWords.reduce((acc, word) => {
            if (!acc.find(item => item.studentId === word.studentId)) {
              acc.push({
                studentId: word.studentId,
                studentNickname: word.studentNickname
              });
            }
            return acc;
          }, []) as student}
            {@const studentSentences = lesson.sentences?.filter(s => s.studentId === student.studentId) || []}
            {#each studentSentences as sentence}
              <div class="sentence-card {sentence.studentId === participation?.id ? 'my-sentence' : ''}">
                <div class="sentence-meta">
                  <span class="author-name">{sentence.studentNickname}</span>
                  <span>•</span>
                  <span>{new Date(sentence.createdAt?.toDate?.() || sentence.createdAt).toLocaleTimeString()}</span>
                </div>
                <div class="sentence-text">{sentence.sentence}</div>
                {#if sentence.usedWords?.length > 0}
                  <div class="used-words">
                    사용한 단어: {sentence.usedWords.join(', ')}
                  </div>
                {/if}
              </div>
            {/each}
          {/each}
        </div>

      {:else if currentStep === LESSON_STEPS.COMPLETED}
        <!-- 수업 완료 -->
        <div style="text-align: center; padding: 3rem; color: #666;">
          <i class="fas fa-check-circle" style="font-size: 4rem; margin-bottom: 1rem; color: #34a853;"></i>
          <h3>수업이 완료되었습니다!</h3>
          <p>오늘 수업에 참여해주셔서 감사합니다.</p>
          <button 
            class="join-button" 
            on:click={handleLeaveLesson}
            style="max-width: 200px; margin: 2rem auto 0;"
          >
            수업 나가기
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>