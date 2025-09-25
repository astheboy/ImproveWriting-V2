<!--
  교사용 수업 생성 및 관리 컴포넌트
  - 수업 생성 (주제, 이미지, 제한시간 등 설정)
  - 수업 설정 변경
  - 수업 단계 제어
-->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth, db, storage } from '$lib/firebase/firebase';
  import { 
    collection, 
    addDoc, 
    doc, 
    updateDoc,
    serverTimestamp 
  } from 'firebase/firestore';
  import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
  } from 'firebase/storage';
  import { 
    lessonSettings,
    updateLessonSettings,
    changeStep,
    getCurrentLesson,
    lessonStep,
    connectedStudentCount,
    wordCollectionProgress,
    sentenceProgress,
    LESSON_STEPS
  } from '$lib/stores';

  const dispatch = createEventDispatcher();

  // Props
  export let classroomId = '';
  export let currentLesson = null;
  export let mode = 'create'; // 'create' | 'manage'

  // 컴포넌트 상태
  let showModal = false;
  let isLoading = false;
  let error = '';

  // 수업 생성 폼 데이터
  let formData = {
    title: '',
    description: '',
    subject: '국어',
    maxWords: 10,
    timeLimit: 30,
    allowAnonymous: true,
    activityImageFile: null,
    activityImageUrl: ''
  };

  // 반응형 상태들
  $: currentStep = $lessonStep;
  $: studentCount = $connectedStudentCount;
  $: wordProgress = $wordCollectionProgress;
  $: sentenceWritingProgress = $sentenceProgress;
  $: settings = $lessonSettings;

  // 과목 목록
  const subjects = [
    '국어', '영어', '수학', '과학', '사회',
    '예술', '체육', '창의적체험활동', '기타'
  ];

  // 수업 단계 이름
  const stepNames = {
    [LESSON_STEPS.PREPARATION]: '준비',
    [LESSON_STEPS.WORD_COLLECTION]: '단어 수집',
    [LESSON_STEPS.SENTENCE_WRITING]: '문장 작성',
    [LESSON_STEPS.SHARING]: '공유 및 발표',
    [LESSON_STEPS.COMPLETED]: '수업 완료'
  };

  onMount(() => {
    // 기존 수업 정보가 있으면 폼에 채우기
    if (mode === 'manage' && currentLesson) {
      formData = {
        title: currentLesson.title || '',
        description: currentLesson.description || '',
        subject: currentLesson.subject || '국어',
        maxWords: currentLesson.maxWords || 10,
        timeLimit: currentLesson.timeLimit || 30,
        allowAnonymous: currentLesson.allowAnonymous ?? true,
        activityImageFile: null,
        activityImageUrl: currentLesson.activityImage || ''
      };
    }
  });

  /**
   * 수업 생성
   */
  async function createLesson() {
    if (!auth.currentUser) {
      error = '로그인이 필요합니다.';
      return;
    }

    if (!formData.title.trim()) {
      error = '수업 제목을 입력해주세요.';
      return;
    }

    if (!classroomId) {
      error = '교실 정보가 필요합니다.';
      return;
    }

    try {
      isLoading = true;
      error = '';

      let activityImageUrl = formData.activityImageUrl;

      // 이미지 파일이 있으면 업로드
      if (formData.activityImageFile) {
        activityImageUrl = await uploadActivityImage(formData.activityImageFile);
      }

      // 수업 데이터 준비
      const lessonData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject: formData.subject,
        classroomId,
        teacherId: auth.currentUser.uid,
        teacherEmail: auth.currentUser.email,
        
        // 수업 설정
        maxWords: formData.maxWords,
        timeLimit: formData.timeLimit,
        allowAnonymous: formData.allowAnonymous,
        activityImage: activityImageUrl,
        
        // 수업 상태
        currentStep: LESSON_STEPS.PREPARATION,
        status: 'active',
        
        // 타임스탬프
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Firestore에 수업 생성
      const lessonRef = await addDoc(collection(db, 'lessons'), lessonData);

      console.log('📚 수업 생성 완료:', lessonRef.id);

      // 이벤트 디스패치
      dispatch('lessonCreated', {
        id: lessonRef.id,
        ...lessonData
      });

      // 모달 닫기 및 폼 초기화
      closeModal();
      resetForm();

    } catch (err) {
      console.error('수업 생성 오류:', err);
      error = `수업 생성 중 오류가 발생했습니다: ${err.message}`;
      
    } finally {
      isLoading = false;
    }
  }

  /**
   * 수업 설정 업데이트
   */
  async function updateSettings() {
    if (!currentLesson) return;

    try {
      isLoading = true;
      error = '';

      let activityImageUrl = formData.activityImageUrl;

      // 새 이미지 파일이 있으면 업로드
      if (formData.activityImageFile) {
        activityImageUrl = await uploadActivityImage(formData.activityImageFile);
      }

      const updates = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject: formData.subject,
        maxWords: formData.maxWords,
        timeLimit: formData.timeLimit,
        allowAnonymous: formData.allowAnonymous,
        activityImage: activityImageUrl,
        updatedAt: serverTimestamp()
      };

      // Firestore 업데이트
      await updateDoc(doc(db, 'lessons', currentLesson.id), updates);

      // 스토어 업데이트
      await updateLessonSettings(currentLesson.id, updates);

      console.log('⚙️ 수업 설정 업데이트 완료');

      dispatch('lessonUpdated', updates);
      closeModal();

    } catch (err) {
      console.error('수업 설정 업데이트 오류:', err);
      error = `설정 업데이트 중 오류가 발생했습니다: ${err.message}`;
      
    } finally {
      isLoading = false;
    }
  }

  /**
   * 수업 단계 변경
   */
  async function handleStepChange(newStep) {
    if (!currentLesson) return;

    try {
      await changeStep(currentLesson.id, newStep);
      console.log(`📚 수업 단계 변경: ${newStep}`);
      
    } catch (err) {
      console.error('수업 단계 변경 오류:', err);
      error = `단계 변경 중 오류가 발생했습니다: ${err.message}`;
    }
  }

  /**
   * 활동 이미지 업로드
   */
  async function uploadActivityImage(file) {
    try {
      const timestamp = Date.now();
      const fileName = `lesson-images/${timestamp}-${file.name}`;
      const storageRef = ref(storage, fileName);

      // 파일 업로드
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('🖼️ 이미지 업로드 완료:', downloadURL);
      return downloadURL;

    } catch (err) {
      console.error('이미지 업로드 오류:', err);
      throw new Error('이미지 업로드에 실패했습니다.');
    }
  }

  /**
   * 이미지 파일 선택 처리
   */
  function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        error = '이미지 파일 크기는 5MB 이하여야 합니다.';
        return;
      }

      // 파일 형식 체크
      if (!file.type.startsWith('image/')) {
        error = '이미지 파일만 업로드할 수 있습니다.';
        return;
      }

      formData.activityImageFile = file;

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        formData.activityImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * 모달 열기
   */
  function openModal() {
    showModal = true;
    error = '';
  }

  /**
   * 모달 닫기
   */
  function closeModal() {
    showModal = false;
    error = '';
  }

  /**
   * 폼 초기화
   */
  function resetForm() {
    formData = {
      title: '',
      description: '',
      subject: '국어',
      maxWords: 10,
      timeLimit: 30,
      allowAnonymous: true,
      activityImageFile: null,
      activityImageUrl: ''
    };
  }

  /**
   * 다음 단계로 진행 가능한지 확인
   */
  function canProceedToNext(step) {
    switch (step) {
      case LESSON_STEPS.WORD_COLLECTION:
        return studentCount > 0;
      case LESSON_STEPS.SENTENCE_WRITING:
        return wordProgress > 50; // 50% 이상 제출시
      case LESSON_STEPS.SHARING:
        return sentenceWritingProgress > 30; // 30% 이상 제출시
      case LESSON_STEPS.COMPLETED:
        return true;
      default:
        return true;
    }
  }
</script>

<style>
  .lesson-creator {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .lesson-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .current-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .status-number {
    font-size: 1.5rem;
    font-weight: bold;
    color: #4285f4;
  }

  .status-label {
    font-size: 0.75rem;
    color: #666;
  }

  .step-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .step-button {
    padding: 0.5rem 1rem;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .step-button:hover {
    border-color: #4285f4;
    color: #4285f4;
  }

  .step-button.active {
    background: #4285f4;
    border-color: #4285f4;
    color: white;
  }

  .step-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .create-button, .settings-button {
    padding: 0.75rem 1.5rem;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .create-button:hover, .settings-button:hover {
    background: #3367d6;
  }

  .settings-button {
    background: #666;
  }

  .settings-button:hover {
    background: #555;
  }

  /* 모달 스타일 */
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
    border-radius: 12px;
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
    margin-bottom: 2rem;
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
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .close-button:hover {
    background: #f0f0f0;
  }

  .form-grid {
    display: grid;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-weight: 500;
    color: #333;
  }

  .form-input, .form-select, .form-textarea {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .form-input:focus, .form-select:focus, .form-textarea:focus {
    outline: none;
    border-color: #4285f4;
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .image-upload {
    border: 2px dashed #e0e0e0;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .image-upload:hover {
    border-color: #4285f4;
  }

  .image-preview {
    margin-top: 1rem;
  }

  .image-preview img {
    max-width: 200px;
    max-height: 150px;
    border-radius: 8px;
    object-fit: cover;
  }

  .error-message {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f8d7da;
    border-radius: 4px;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
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

  .cancel-button:hover {
    background: #5a6268;
  }

  .submit-button {
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

  .submit-button:hover {
    background: #3367d6;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff40;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>

<div class="lesson-creator">
  {#if mode === 'create'}
    <!-- 수업 생성 버튼 -->
    <div class="lesson-controls">
      <h3>새로운 수업 만들기</h3>
      <button class="create-button" on:click={openModal}>
        <i class="fas fa-plus"></i>
        수업 생성
      </button>
    </div>
    
  {:else if mode === 'manage' && currentLesson}
    <!-- 수업 관리 인터페이스 -->
    <div class="lesson-controls">
      <h3>{currentLesson.title}</h3>
      <button class="settings-button" on:click={openModal}>
        <i class="fas fa-cog"></i>
        설정
      </button>
    </div>

    <!-- 현재 상태 표시 -->
    <div class="current-status">
      <div class="status-item">
        <div class="status-number">{studentCount}</div>
        <div class="status-label">참여 학생</div>
      </div>
      <div class="status-item">
        <div class="status-number">{wordProgress}%</div>
        <div class="status-label">단어 제출률</div>
      </div>
      <div class="status-item">
        <div class="status-number">{sentenceWritingProgress}%</div>
        <div class="status-label">문장 제출률</div>
      </div>
    </div>

    <!-- 단계 제어 버튼들 -->
    <div class="step-controls">
      {#each Object.entries(LESSON_STEPS) as [key, step]}
        <button 
          class="step-button {currentStep === step ? 'active' : ''}"
          disabled={!canProceedToNext(step)}
          on:click={() => handleStepChange(step)}
        >
          {stepNames[step]}
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- 수업 생성/설정 모달 -->
{#if showModal}
  <div 
    class="modal" 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="lesson-modal-title"
    on:click={closeModal}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    }}
  >
    <div 
      class="modal-content" 
      role="document"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h2 id="lesson-modal-title" class="modal-title">
          {mode === 'create' ? '새 수업 만들기' : '수업 설정'}
        </h2>
        <button class="close-button" on:click={closeModal}>×</button>
      </div>

      <div class="form-grid">
        <!-- 기본 정보 -->
        <div class="form-group">
          <label class="form-label" for="lesson-title">수업 제목 *</label>
          <input 
            id="lesson-title"
            class="form-input" 
            type="text" 
            bind:value={formData.title}
            placeholder="예: 여름 풍경 묘사하기"
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="lesson-description">수업 설명</label>
          <textarea 
            id="lesson-description"
            class="form-textarea"
            bind:value={formData.description}
            placeholder="수업 목표나 간단한 설명을 입력해주세요..."
            maxlength="500"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="lesson-subject">과목</label>
          <select id="lesson-subject" class="form-select" bind:value={formData.subject}>
            {#each subjects as subject}
              <option value={subject}>{subject}</option>
            {/each}
          </select>
        </div>

        <!-- 활동 설정 -->
        <div class="form-group">
          <label class="form-label" for="max-words">최대 단어 수</label>
          <input 
            id="max-words"
            class="form-input" 
            type="number" 
            bind:value={formData.maxWords}
            min="5"
            max="20"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="time-limit">제한시간 (분)</label>
          <input 
            id="time-limit"
            class="form-input" 
            type="number" 
            bind:value={formData.timeLimit}
            min="10"
            max="90"
          />
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input 
              id="allow-anonymous"
              type="checkbox" 
              bind:checked={formData.allowAnonymous}
            />
            <label class="form-label" for="allow-anonymous">익명 참여 허용</label>
          </div>
        </div>

        <!-- 활동 이미지 -->
        <div class="form-group">
          <label class="form-label" for="image-input">활동 이미지</label>
          <div 
            class="image-upload" 
            role="button" 
            tabindex="0"
            on:click={() => document.getElementById('image-input').click()}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.getElementById('image-input').click();
              }
            }}
            aria-label="이미지 파일 선택"
          >
            <input 
              id="image-input"
              type="file" 
              accept="image/*"
              on:change={handleImageSelect}
              style="display: none"
            />
            <i class="fas fa-image" style="font-size: 2rem; color: #ccc; margin-bottom: 0.5rem;"></i>
            <p>이미지를 선택하거나 드래그하여 업로드하세요</p>
            <p style="font-size: 0.75rem; color: #666;">최대 5MB, JPG/PNG 형식</p>
          </div>
          
          {#if formData.activityImageUrl}
            <div class="image-preview">
              <img src={formData.activityImageUrl} alt="활동 이미지 미리보기" />
            </div>
          {/if}
        </div>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="modal-actions">
        <button class="cancel-button" on:click={closeModal} disabled={isLoading}>
          취소
        </button>
        <button 
          class="submit-button" 
          on:click={mode === 'create' ? createLesson : updateSettings}
          disabled={isLoading || !formData.title.trim()}
        >
          {#if isLoading}
            <div class="loading-spinner"></div>
          {/if}
          {mode === 'create' ? '수업 생성' : '설정 저장'}
        </button>
      </div>
    </div>
  </div>
{/if}