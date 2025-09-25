<!--
  교사용 실시간 수업 진행 대시보드
  - 실시간 학생 참여 현황
  - 단어/문장 제출 진행률 모니터링
  - 수업 단계 제어
  - 활동 타이머
  - 제출 내용 실시간 확인
-->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { 
    currentLesson,
    lessonStep,
    connectedStudents,
    submittedWords,
    submittedSentences,
    wordCollectionProgress,
    sentenceProgress,
    connectedStudentCount,
    changeStep,
    updateLessonSettings,
    LESSON_STEPS
  } from '$lib/stores';
  import LessonCreator from './LessonCreator.svelte';

  const dispatch = createEventDispatcher();

  // Props
  export let lessonId = '';

  // 컴포넌트 상태
  let showStudentDetails = false;
  let showSubmissionDetails = false;
  let selectedStudent = null;
  let timerActive = false;
  let timeRemaining = 0;
  let timerInterval = null;
  let autoProgressEnabled = true;
  let error = '';

  // 반응형 상태들
  $: lesson = $currentLesson;
  $: currentStep = $lessonStep;
  $: students = $connectedStudents;
  $: allWords = $submittedWords;
  $: allSentences = $submittedSentences;
  $: wordProgress = $wordCollectionProgress;
  $: sentenceWritingProgress = $sentenceProgress;
  $: studentCount = $connectedStudentCount;

  // 단계별 정보
  const stepConfig = {
    [LESSON_STEPS.PREPARATION]: {
      name: '준비',
      icon: 'fas fa-cog',
      color: '#6c757d',
      description: '수업 준비 중',
      canProceed: () => studentCount > 0
    },
    [LESSON_STEPS.WORD_COLLECTION]: {
      name: '단어 수집',
      icon: 'fas fa-lightbulb',
      color: '#ffc107',
      description: '학생들이 단어를 수집하고 있습니다',
      canProceed: () => wordProgress >= 50
    },
    [LESSON_STEPS.SENTENCE_WRITING]: {
      name: '문장 작성',
      icon: 'fas fa-pencil-alt',
      color: '#17a2b8',
      description: '학생들이 문장을 작성하고 있습니다',
      canProceed: () => sentenceWritingProgress >= 30
    },
    [LESSON_STEPS.SHARING]: {
      name: '공유',
      icon: 'fas fa-share-alt',
      color: '#28a745',
      description: '작품을 공유하고 감상하는 시간입니다',
      canProceed: () => true
    },
    [LESSON_STEPS.COMPLETED]: {
      name: '완료',
      icon: 'fas fa-check-circle',
      color: '#6f42c1',
      description: '수업이 완료되었습니다',
      canProceed: () => true
    }
  };

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  /**
   * 수업 단계 변경
   */
  async function handleStepChange(newStep) {
    try {
      await changeStep(lessonId, newStep);
      
      // 단계 변경시 타이머 설정
      if (newStep === LESSON_STEPS.WORD_COLLECTION || newStep === LESSON_STEPS.SENTENCE_WRITING) {
        const timeLimit = lesson?.timeLimit || 30;
        startTimer(timeLimit * 60); // 분을 초로 변환
      } else {
        stopTimer();
      }
      
      console.log(`📚 수업 단계 변경: ${newStep}`);
      
    } catch (err) {
      console.error('수업 단계 변경 오류:', err);
      error = `단계 변경 중 오류가 발생했습니다: ${err.message}`;
    }
  }

  /**
   * 타이머 시작
   */
  function startTimer(seconds) {
    stopTimer(); // 기존 타이머 중지
    
    timeRemaining = seconds;
    timerActive = true;
    
    timerInterval = setInterval(() => {
      timeRemaining--;
      
      if (timeRemaining <= 0) {
        stopTimer();
        handleTimerComplete();
      }
    }, 1000);
  }

  /**
   * 타이머 중지
   */
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerActive = false;
  }

  /**
   * 타이머 완료시 처리
   */
  function handleTimerComplete() {
    if (!autoProgressEnabled) return;

    // 자동으로 다음 단계로 진행
    if (currentStep === LESSON_STEPS.WORD_COLLECTION) {
      handleStepChange(LESSON_STEPS.SENTENCE_WRITING);
    } else if (currentStep === LESSON_STEPS.SENTENCE_WRITING) {
      handleStepChange(LESSON_STEPS.SHARING);
    }
  }

  /**
   * 시간 포맷팅 (MM:SS)
   */
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * 학생별 제출 통계 계산
   */
  function getStudentStats(studentId) {
    const words = allWords.filter(w => w.studentId === studentId);
    const sentences = allSentences.filter(s => s.studentId === studentId);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      lastActivity: Math.max(
        ...words.map(w => w.createdAt?.toDate?.()?.getTime() || 0),
        ...sentences.map(s => s.createdAt?.toDate?.()?.getTime() || 0),
        0
      )
    };
  }

  /**
   * 단어 빈도 분석
   */
  function getWordFrequency() {
    const frequency = {};
    allWords.forEach(wordItem => {
      const word = wordItem.word.toLowerCase();
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // 상위 10개
  }

  /**
   * 학생 상세 정보 보기
   */
  function showStudentInfo(student) {
    selectedStudent = {
      ...student,
      stats: getStudentStats(student.id),
      words: allWords.filter(w => w.studentId === student.id),
      sentences: allSentences.filter(s => s.studentId === student.id)
    };
    showStudentDetails = true;
  }

  /**
   * 진행률에 따른 색상 결정
   */
  function getProgressColor(progress) {
    if (progress >= 80) return '#28a745';
    if (progress >= 60) return '#ffc107';
    if (progress >= 40) return '#fd7e14';
    return '#dc3545';
  }

  /**
   * 온라인 상태 확인 (30초 이내 활동)
   */
  function isStudentOnline(student) {
    if (!student.lastSeen) return false;
    const lastSeenTime = student.lastSeen.toDate?.()?.getTime() || student.lastSeen;
    return Date.now() - lastSeenTime < 30000; // 30초
  }
</script>

<style>
  .lesson-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 1.5rem;
  }

  .dashboard-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 16px;
    padding: 2rem;
    position: relative;
    overflow: hidden;
  }

  .dashboard-title {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .dashboard-subtitle {
    opacity: 0.9;
    font-size: 1.1rem;
  }

  /* 수업 진행 제어 */
  .lesson-controls {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .controls-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .controls-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #333;
  }

  .timer-display {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .timer-time {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    font-family: 'Courier New', monospace;
  }

  .timer-active {
    color: #dc3545;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .timer-controls {
    display: flex;
    gap: 0.5rem;
  }

  .timer-button {
    background: none;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    color: #6c757d;
    transition: all 0.2s;
  }

  .timer-button:hover {
    border-color: #4285f4;
    color: #4285f4;
  }

  .timer-button.active {
    background: #4285f4;
    border-color: #4285f4;
    color: white;
  }

  /* 단계 진행 */
  .step-progression {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    overflow-x: auto;
    padding: 0.5rem 0;
  }

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    min-width: 120px;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    background: #f8f9fa;
  }

  .step-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .step-item.active {
    background: var(--step-color, #4285f4);
    color: white;
    border-color: var(--step-color, #4285f4);
  }

  .step-item.completed {
    background: #e8f5e8;
    border-color: #28a745;
    color: #28a745;
  }

  .step-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .step-icon {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .step-name {
    font-weight: 500;
    font-size: 0.9rem;
    text-align: center;
  }

  .step-progress {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  /* 통계 카드들 */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border-left: 4px solid var(--accent-color, #4285f4);
  }

  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .stat-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent-color, #4285f4);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--accent-color, #4285f4);
    margin-bottom: 0.5rem;
  }

  .stat-description {
    color: #666;
    font-size: 0.9rem;
  }

  /* 진행률 바 */
  .progress-bar-container {
    margin-top: 1rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--progress-color, #4285f4);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.5rem;
  }

  /* 학생 목록 */
  .students-section {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #333;
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .toggle-button {
    padding: 0.5rem 1rem;
    border: 2px solid #dee2e6;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .toggle-button.active {
    background: #4285f4;
    border-color: #4285f4;
    color: white;
  }

  .students-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .student-card {
    border: 2px solid #e9ecef;
    border-radius: 12px;
    padding: 1rem;
    transition: all 0.2s;
    cursor: pointer;
  }

  .student-card:hover {
    border-color: #4285f4;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .student-card.online {
    border-left: 4px solid #28a745;
  }

  .student-card.offline {
    border-left: 4px solid #dc3545;
    opacity: 0.7;
  }

  .student-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .student-name {
    font-weight: 600;
    color: #333;
  }

  .student-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #666;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-dot.online {
    background: #28a745;
  }

  .status-dot.offline {
    background: #dc3545;
  }

  .student-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .student-stat {
    display: flex;
    justify-content: space-between;
  }

  .stat-label {
    color: #666;
  }

  .stat-number {
    font-weight: 600;
    color: #333;
  }

  /* 제출 내용 보기 */
  .submissions-section {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .word-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .word-item {
    background: #e8f0fe;
    color: #1976d2;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 500;
    position: relative;
  }

  .word-frequency {
    background: #1976d2;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    position: absolute;
    top: -8px;
    right: -8px;
  }

  /* 모달 */
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0.5rem;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .close-button:hover {
    background: #f0f0f0;
  }

  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border-left: 4px solid #dc3545;
  }

  /* 반응형 */
  @media (max-width: 768px) {
    .lesson-dashboard {
      padding: 0.5rem;
      gap: 1rem;
    }
    
    .dashboard-header, .lesson-controls, .students-section, .submissions-section {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .step-progression {
      flex-direction: column;
      align-items: stretch;
    }
    
    .step-item {
      min-width: auto;
      flex-direction: row;
      justify-content: flex-start;
      text-align: left;
    }
    
    .students-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="lesson-dashboard">
  <!-- 대시보드 헤더 -->
  <div class="dashboard-header">
    <div class="dashboard-title">
      {lesson?.title || '수업 대시보드'}
    </div>
    <div class="dashboard-subtitle">
      {lesson?.description || '실시간 수업 진행 현황을 확인하고 제어하세요'}
    </div>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <!-- 수업 제어 패널 -->
  <div class="lesson-controls">
    <div class="controls-header">
      <h3 class="controls-title">수업 진행 제어</h3>
      
      <!-- 타이머 표시 -->
      {#if timerActive}
        <div class="timer-display">
          <div class="timer-time {timerActive ? 'timer-active' : ''}">
            {formatTime(timeRemaining)}
          </div>
          <div class="timer-controls">
            <button 
              class="timer-button {timerActive ? 'active' : ''}"
              on:click={stopTimer}
              title="타이머 중지"
            >
              <i class="fas fa-stop"></i>
            </button>
            <button 
              class="timer-button"
              on:click={() => startTimer((lesson?.timeLimit || 30) * 60)}
              title="타이머 재시작"
            >
              <i class="fas fa-redo"></i>
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- 단계 진행 -->
    <div class="step-progression">
      {#each Object.entries(LESSON_STEPS) as [key, step]}
        {@const config = stepConfig[step]}
        {@const isActive = currentStep === step}
        {@const isCompleted = Object.values(LESSON_STEPS).indexOf(currentStep) > Object.values(LESSON_STEPS).indexOf(step)}
        {@const canProceed = config.canProceed()}
        
        <button
          class="step-item {isActive ? 'active' : ''} {isCompleted ? 'completed' : ''}"
          style="--step-color: {config.color}"
          disabled={!canProceed && !isActive && !isCompleted}
          on:click={() => handleStepChange(step)}
        >
          <div class="step-icon">
            <i class="{config.icon}"></i>
          </div>
          <div class="step-name">{config.name}</div>
          {#if step === LESSON_STEPS.WORD_COLLECTION}
            <div class="step-progress">{wordProgress}%</div>
          {:else if step === LESSON_STEPS.SENTENCE_WRITING}
            <div class="step-progress">{sentenceWritingProgress}%</div>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- 통계 카드들 -->
  <div class="stats-grid">
    <!-- 참여 학생 수 -->
    <div class="stat-card" style="--accent-color: #4285f4">
      <div class="stat-header">
        <div class="stat-title">참여 학생</div>
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
      </div>
      <div class="stat-value">{studentCount}</div>
      <div class="stat-description">
        온라인: {students.filter(s => isStudentOnline(s)).length}명
      </div>
    </div>

    <!-- 단어 수집 진행률 -->
    <div class="stat-card" style="--accent-color: #ffc107">
      <div class="stat-header">
        <div class="stat-title">단어 수집</div>
        <div class="stat-icon">
          <i class="fas fa-lightbulb"></i>
        </div>
      </div>
      <div class="stat-value">{wordProgress}%</div>
      <div class="stat-description">총 {allWords.length}개 단어 수집됨</div>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {wordProgress}%; --progress-color: {getProgressColor(wordProgress)}"
          ></div>
        </div>
        <div class="progress-text">
          <span>진행률</span>
          <span>{wordProgress}%</span>
        </div>
      </div>
    </div>

    <!-- 문장 작성 진행률 -->
    <div class="stat-card" style="--accent-color: #17a2b8">
      <div class="stat-header">
        <div class="stat-title">문장 작성</div>
        <div class="stat-icon">
          <i class="fas fa-pencil-alt"></i>
        </div>
      </div>
      <div class="stat-value">{sentenceWritingProgress}%</div>
      <div class="stat-description">총 {allSentences.length}개 문장 제출됨</div>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {sentenceWritingProgress}%; --progress-color: {getProgressColor(sentenceWritingProgress)}"
          ></div>
        </div>
        <div class="progress-text">
          <span>진행률</span>
          <span>{sentenceWritingProgress}%</span>
        </div>
      </div>
    </div>

    <!-- 현재 단계 정보 -->
    <div class="stat-card" style="--accent-color: {stepConfig[currentStep]?.color || '#6c757d'}">
      <div class="stat-header">
        <div class="stat-title">현재 단계</div>
        <div class="stat-icon">
          <i class="{stepConfig[currentStep]?.icon || 'fas fa-info'}"></i>
        </div>
      </div>
      <div class="stat-value" style="font-size: 1.3rem;">
        {stepConfig[currentStep]?.name || '알 수 없음'}
      </div>
      <div class="stat-description">
        {stepConfig[currentStep]?.description || ''}
      </div>
    </div>
  </div>

  <!-- 학생 참여 현황 -->
  <div class="students-section">
    <div class="section-header">
      <h3 class="section-title">학생 참여 현황 ({studentCount}명)</h3>
      <div class="view-toggle">
        <button 
          class="toggle-button {!showStudentDetails ? 'active' : ''}"
          on:click={() => showStudentDetails = false}
        >
          목록 보기
        </button>
        <button 
          class="toggle-button {showSubmissionDetails ? 'active' : ''}"
          on:click={() => showSubmissionDetails = !showSubmissionDetails}
        >
          제출 현황
        </button>
      </div>
    </div>

    {#if !showSubmissionDetails}
      <!-- 학생 카드 목록 -->
      <div class="students-grid">
        {#each students as student}
          {@const isOnline = isStudentOnline(student)}
          {@const stats = getStudentStats(student.id)}
          
          <div 
            class="student-card {isOnline ? 'online' : 'offline'}"
            role="button"
            tabindex="0"
            on:click={() => showStudentInfo(student)}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showStudentInfo(student);
              }
            }}
            aria-label="{student.nickname} 상세 정보 보기"
          >
            <div class="student-header">
              <div class="student-name">{student.nickname}</div>
              <div class="student-status">
                <div class="status-dot {isOnline ? 'online' : 'offline'}"></div>
                {isOnline ? '온라인' : '오프라인'}
              </div>
            </div>
            
            <div class="student-stats">
              <div class="student-stat">
                <span class="stat-label">단어</span>
                <span class="stat-number">{stats.wordCount}개</span>
              </div>
              <div class="student-stat">
                <span class="stat-label">문장</span>
                <span class="stat-number">{stats.sentenceCount}개</span>
              </div>
              <div class="student-stat">
                <span class="stat-label">참여시간</span>
                <span class="stat-number">
                  {student.joinedAt ? 
                    Math.floor((Date.now() - student.joinedAt.toDate().getTime()) / 60000) : 0}분
                </span>
              </div>
              <div class="student-stat">
                <span class="stat-label">마지막 활동</span>
                <span class="stat-number">
                  {stats.lastActivity ? 
                    Math.floor((Date.now() - stats.lastActivity) / 60000) : '없음'}분 전
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
    {:else}
      <!-- 제출 내용 현황 -->
      <div class="submissions-section">
        <h4>수집된 단어들</h4>
        <div class="word-cloud">
          {#each getWordFrequency() as [word, count]}
            <div class="word-item">
              {word}
              {#if count > 1}
                <div class="word-frequency">{count}</div>
              {/if}
            </div>
          {/each}
        </div>

        {#if allSentences.length > 0}
          <h4>제출된 문장들</h4>
          <div style="display: grid; gap: 1rem; margin-top: 1rem;">
            {#each allSentences as sentence}
              <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #4285f4;">
                <div style="font-weight: 600; color: #333; margin-bottom: 0.5rem;">
                  {sentence.studentNickname}
                </div>
                <div style="margin-bottom: 0.5rem;">
                  {sentence.sentence}
                </div>
                {#if sentence.usedWords?.length > 0}
                  <div style="font-size: 0.875rem; color: #666;">
                    사용한 단어: {sentence.usedWords.join(', ')}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 수업 생성/설정 컴포넌트 -->
  <LessonCreator 
    {lessonId} 
    currentLesson={lesson}
    mode="manage"
    on:lessonUpdated={(e) => {
      console.log('수업 설정 업데이트됨:', e.detail);
      error = '';
    }}
  />
</div>

<!-- 학생 상세 정보 모달 -->
{#if showStudentDetails && selectedStudent}
  <div 
    class="modal" 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="modal-title"
    on:click={() => showStudentDetails = false}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        showStudentDetails = false;
      }
    }}
  >
    <div 
      class="modal-content" 
      role="document"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h3 id="modal-title" class="modal-title">{selectedStudent.nickname} 상세 정보</h3>
        <button class="close-button" on:click={() => showStudentDetails = false}>
          ×
        </button>
      </div>

      <div style="display: grid; gap: 1.5rem;">
        <!-- 기본 정보 -->
        <div>
          <h4>참여 정보</h4>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
            <div>참여 시간: {selectedStudent.joinedAt?.toDate().toLocaleString()}</div>
            <div>온라인 상태: {isStudentOnline(selectedStudent) ? '온라인' : '오프라인'}</div>
            <div>마지막 활동: {selectedStudent.lastSeen?.toDate().toLocaleString()}</div>
          </div>
        </div>

        <!-- 제출한 단어들 -->
        {#if selectedStudent.words?.length > 0}
          <div>
            <h4>제출한 단어들 ({selectedStudent.words.length}개)</h4>
            <div class="word-cloud">
              {#each selectedStudent.words as wordItem}
                <div class="word-item">{wordItem.word}</div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 제출한 문장들 -->
        {#if selectedStudent.sentences?.length > 0}
          <div>
            <h4>제출한 문장들 ({selectedStudent.sentences.length}개)</h4>
            {#each selectedStudent.sentences as sentence}
              <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <div>{sentence.sentence}</div>
                {#if sentence.usedWords?.length > 0}
                  <div style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">
                    사용한 단어: {sentence.usedWords.join(', ')}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}