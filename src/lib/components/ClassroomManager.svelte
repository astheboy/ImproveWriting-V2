<!--
  교실 생성, 수정, 관리를 위한 컴포넌트
  - 교실 생성 및 설정
  - 교실 목록 보기
  - 참여 코드 관리 (재생성)
  - 교실 수정/삭제
  - 수업 목록 보기
-->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { auth } from '$lib/firebase/firebase';
  import { 
    teacherClassrooms,
    classroomManagement,
    currentClassroom,
    classroomLessons,
    classroomActivity,
    createClassroom,
    updateClassroom,
    deleteClassroom,
    regenerateJoinCode,
    loadClassroom,
    subscribeToTeacherClassrooms,
    unsubscribeClassroomUpdates,
    isValidClassroom,
    canManageClassroom
  } from '$lib/stores';

  const dispatch = createEventDispatcher();

  // Props
  export let mode = 'list'; // 'list' | 'create' | 'edit' | 'view'
  export let selectedClassroomId = '';

  // 컴포넌트 상태
  let showCreateModal = false;
  let showEditModal = false;
  let showDeleteConfirm = false;
  let classroomToDelete = null;
  let error = '';

  // 교실 생성/수정 폼
  let formData = {
    name: '',
    description: '',
    maxStudentsPerLesson: 30,
    allowAnonymous: true,
    autoApproveJoin: true
  };

  // 반응형 상태들
  $: classrooms = $teacherClassrooms;
  $: management = $classroomManagement;
  $: selectedClassroom = $currentClassroom;
  $: lessons = $classroomLessons;
  $: activity = $classroomActivity;

  onMount(() => {
    // 교사의 교실 목록 구독
    if (auth.currentUser) {
      subscribeToTeacherClassrooms(auth.currentUser.uid);
    }

    // 선택된 교실이 있으면 로드
    if (selectedClassroomId) {
      handleSelectClassroom(selectedClassroomId);
    }
  });

  /**
   * 교실 선택
   */
  async function handleSelectClassroom(classroomId) {
    try {
      await loadClassroom(classroomId);
      selectedClassroomId = classroomId;
      mode = 'view';
      
      dispatch('classroomSelected', { 
        classroomId, 
        classroom: $currentClassroom 
      });
      
    } catch (err) {
      console.error('교실 선택 오류:', err);
      error = `교실을 불러올 수 없습니다: ${err.message}`;
    }
  }

  /**
   * 새 교실 생성
   */
  async function handleCreateClassroom() {
    try {
      error = '';
      
      const classroomId = await createClassroom(
        formData.name,
        formData.description,
        {
          maxStudentsPerLesson: formData.maxStudentsPerLesson,
          allowAnonymous: formData.allowAnonymous,
          autoApproveJoin: formData.autoApproveJoin
        }
      );

      console.log('🏫 교실 생성 완료:', classroomId);
      
      // 생성된 교실 선택
      await handleSelectClassroom(classroomId);
      
      // 폼 초기화 및 모달 닫기
      resetForm();
      showCreateModal = false;
      
      dispatch('classroomCreated', { classroomId });
      
    } catch (err) {
      console.error('교실 생성 오류:', err);
      error = `교실 생성에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 교실 정보 수정
   */
  async function handleUpdateClassroom() {
    if (!selectedClassroom) return;

    try {
      error = '';
      
      await updateClassroom(selectedClassroom.id, {
        name: formData.name,
        description: formData.description,
        settings: {
          ...selectedClassroom.settings,
          maxStudentsPerLesson: formData.maxStudentsPerLesson,
          allowAnonymous: formData.allowAnonymous,
          autoApproveJoin: formData.autoApproveJoin
        }
      });

      console.log('✏️ 교실 정보 수정 완료');
      
      showEditModal = false;
      dispatch('classroomUpdated', { 
        classroomId: selectedClassroom.id,
        updates: formData 
      });
      
    } catch (err) {
      console.error('교실 수정 오류:', err);
      error = `교실 수정에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 교실 삭제 (아카이브)
   */
  async function handleDeleteClassroom() {
    if (!classroomToDelete) return;

    try {
      error = '';
      
      await deleteClassroom(classroomToDelete.id);
      
      console.log('🗑️ 교실 삭제 완료');
      
      // 삭제된 교실이 현재 선택된 교실이면 선택 해제
      if (selectedClassroomId === classroomToDelete.id) {
        selectedClassroomId = '';
        mode = 'list';
      }
      
      showDeleteConfirm = false;
      classroomToDelete = null;
      
      dispatch('classroomDeleted', { 
        classroomId: classroomToDelete.id 
      });
      
    } catch (err) {
      console.error('교실 삭제 오류:', err);
      error = `교실 삭제에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 참여 코드 재생성
   */
  async function handleRegenerateJoinCode() {
    if (!selectedClassroom) return;

    try {
      error = '';
      
      const newJoinCode = await regenerateJoinCode(selectedClassroom.id);
      
      console.log('🔄 참여 코드 재생성 완료:', newJoinCode);
      
      dispatch('joinCodeRegenerated', { 
        classroomId: selectedClassroom.id,
        newJoinCode 
      });
      
    } catch (err) {
      console.error('참여 코드 재생성 오류:', err);
      error = `참여 코드 재생성에 실패했습니다: ${err.message}`;
    }
  }

  /**
   * 교실 생성 모달 열기
   */
  function openCreateModal() {
    resetForm();
    showCreateModal = true;
    error = '';
  }

  /**
   * 교실 수정 모달 열기
   */
  function openEditModal() {
    if (!selectedClassroom) return;
    
    formData = {
      name: selectedClassroom.name || '',
      description: selectedClassroom.description || '',
      maxStudentsPerLesson: selectedClassroom.settings?.maxStudentsPerLesson || 30,
      allowAnonymous: selectedClassroom.settings?.allowAnonymous ?? true,
      autoApproveJoin: selectedClassroom.settings?.autoApproveJoin ?? true
    };
    
    showEditModal = true;
    error = '';
  }

  /**
   * 삭제 확인 모달 열기
   */
  function openDeleteConfirm(classroom) {
    classroomToDelete = classroom;
    showDeleteConfirm = true;
  }

  /**
   * 폼 초기화
   */
  function resetForm() {
    formData = {
      name: '',
      description: '',
      maxStudentsPerLesson: 30,
      allowAnonymous: true,
      autoApproveJoin: true
    };
  }

  /**
   * 참여 코드 복사
   */
  function copyJoinCode(joinCode) {
    navigator.clipboard.writeText(joinCode).then(() => {
      // 간단한 토스트 알림 (실제 구현에서는 toast 라이브러리 사용 권장)
      const originalText = event.target.textContent;
      event.target.textContent = '복사됨!';
      setTimeout(() => {
        event.target.textContent = originalText;
      }, 1000);
    }).catch(err => {
      console.error('클립보드 복사 실패:', err);
    });
  }

  /**
   * 교실 상태에 따른 색상 결정
   */
  function getClassroomStatusColor(classroom) {
    if (!isValidClassroom(classroom)) return '#dc3545';
    if (classroom.status === 'active') return '#28a745';
    if (classroom.status === 'archived') return '#6c757d';
    return '#ffc107';
  }

  /**
   * 날짜 포맷팅
   */
  function formatDate(timestamp) {
    if (!timestamp) return '알 수 없음';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * 상대 시간 계산
   */
  function getRelativeTime(timestamp) {
    if (!timestamp) return '알 수 없음';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  }
</script>

<style>
  .classroom-manager {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  .manager-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 16px;
  }

  .header-title {
    font-size: 1.8rem;
    font-weight: 600;
  }

  .header-subtitle {
    opacity: 0.9;
    margin-top: 0.25rem;
  }

  .create-classroom-button {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .create-classroom-button:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }

  /* 교실 목록 */
  .classrooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .classroom-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border-left: 4px solid var(--status-color, #4285f4);
    cursor: pointer;
    transition: all 0.2s;
  }

  .classroom-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .classroom-card.selected {
    border-left-color: #4285f4;
    box-shadow: 0 4px 20px rgba(66, 133, 244, 0.2);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .classroom-name {
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .classroom-description {
    color: #666;
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }

  .classroom-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #999;
  }

  .status-badge {
    background: var(--status-color, #4285f4);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .join-code-display {
    background: #f8f9fa;
    padding: 0.75rem;
    border-radius: 8px;
    margin: 1rem 0;
    text-align: center;
  }

  .join-code {
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    font-weight: bold;
    color: #4285f4;
    letter-spacing: 0.1em;
  }

  .code-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .code-button {
    background: none;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .code-button:hover {
    background: #f8f9fa;
    border-color: #4285f4;
    color: #4285f4;
  }

  .classroom-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e9ecef;
  }

  .stat-item {
    text-align: center;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #4285f4;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #666;
    margin-top: 0.25rem;
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .action-button {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .action-button:hover {
    background: #e9ecef;
    color: #333;
  }

  .action-button.danger:hover {
    background: #f8d7da;
    border-color: #f5c6cb;
    color: #721c24;
  }

  /* 교실 상세 보기 */
  .classroom-details {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 2rem;
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #f8f9fa;
  }

  .details-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }

  .details-actions {
    display: flex;
    gap: 0.75rem;
  }

  .primary-button {
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .primary-button:hover {
    background: #3367d6;
  }

  .secondary-button {
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .secondary-button:hover {
    background: #5a6268;
  }

  /* 수업 목록 */
  .lessons-section {
    margin-top: 2rem;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 1rem;
  }

  .lessons-list {
    display: grid;
    gap: 1rem;
  }

  .lesson-item {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #4285f4;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .lesson-info {
    flex: 1;
  }

  .lesson-title {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .lesson-meta {
    font-size: 0.85rem;
    color: #666;
  }

  .lesson-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .lesson-status.active {
    background: #d4edda;
    color: #155724;
  }

  .lesson-status.completed {
    background: #d1ecf1;
    color: #0c5460;
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
    max-width: 500px;
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
    font-size: 1.4rem;
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

  .form-input, .form-textarea, .form-select {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .form-input:focus, .form-textarea:focus, .form-select:focus {
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

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  .cancel-button {
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    font-weight: 500;
  }

  .cancel-button:hover {
    background: #5a6268;
  }

  .submit-button {
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
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

  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border-left: 4px solid #dc3545;
  }

  /* 빈 상태 */
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #666;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    color: #ccc;
  }

  .empty-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .empty-description {
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  /* 반응형 */
  @media (max-width: 768px) {
    .classroom-manager {
      padding: 0.5rem;
    }
    
    .classrooms-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .manager-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .classroom-stats {
      grid-template-columns: 1fr 1fr;
    }
    
    .details-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .details-actions {
      width: 100%;
      justify-content: center;
    }
  }
</style>

<div class="classroom-manager">
  <!-- 관리자 헤더 -->
  <div class="manager-header">
    <div>
      <div class="header-title">교실 관리</div>
      <div class="header-subtitle">
        {classrooms.length}개의 교실을 관리하고 있습니다
      </div>
    </div>
    <button class="create-classroom-button" on:click={openCreateModal}>
      <i class="fas fa-plus"></i>
      새 교실 만들기
    </button>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if mode === 'list' || mode === 'create'}
    <!-- 교실 목록 -->
    {#if classrooms.length > 0}
      <div class="classrooms-grid">
        {#each classrooms as classroom}
          {@const statusColor = getClassroomStatusColor(classroom)}
          
          <div 
            class="classroom-card {selectedClassroomId === classroom.id ? 'selected' : ''}"
            style="--status-color: {statusColor}"
            role="button"
            tabindex="0"
            on:click={() => handleSelectClassroom(classroom.id)}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectClassroom(classroom.id);
              }
            }}
            aria-label="{classroom.name} 교실 상세 정보 보기"
          >
            <div class="card-header">
              <div>
                <div class="classroom-name">{classroom.name}</div>
                {#if classroom.description}
                  <div class="classroom-description">{classroom.description}</div>
                {/if}
                <div class="classroom-meta">
                  <span>생성: {getRelativeTime(classroom.createdAt)}</span>
                  <span>•</span>
                  <span>{classroom.teacherEmail}</span>
                </div>
              </div>
              <div class="status-badge" style="background: {statusColor}">
                {classroom.status === 'active' ? '활성' : '보관됨'}
              </div>
            </div>

            <div class="join-code-display">
              <div class="join-code">{classroom.joinCode}</div>
              <div class="code-actions">
                <button 
                  class="code-button"
                  on:click|stopPropagation={() => copyJoinCode(classroom.joinCode)}
                >
                  <i class="fas fa-copy"></i> 복사
                </button>
                <button 
                  class="code-button"
                  on:click|stopPropagation={handleRegenerateJoinCode}
                >
                  <i class="fas fa-redo"></i> 재생성
                </button>
              </div>
            </div>

            <div class="classroom-stats">
              <div class="stat-item">
                <div class="stat-value">{activity.totalLessons || 0}</div>
                <div class="stat-label">총 수업</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{activity.activeLessons || 0}</div>
                <div class="stat-label">진행 중</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{activity.totalStudents || 0}</div>
                <div class="stat-label">참여 학생</div>
              </div>
            </div>

            <div class="card-actions">
              <button 
                class="action-button"
                on:click|stopPropagation={openEditModal}
                title="교실 수정"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                class="action-button danger"
                on:click|stopPropagation={() => openDeleteConfirm(classroom)}
                title="교실 삭제"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        {/each}
      </div>
      
    {:else}
      <!-- 빈 상태 -->
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-school"></i>
        </div>
        <div class="empty-title">아직 교실이 없습니다</div>
        <div class="empty-description">
          첫 번째 교실을 만들어 학생들과 함께 창의적인 글쓰기를 시작해보세요!
        </div>
        <button class="primary-button" on:click={openCreateModal}>
          <i class="fas fa-plus"></i>
          첫 교실 만들기
        </button>
      </div>
    {/if}
  {/if}

  {#if mode === 'view' && selectedClassroom}
    <!-- 교실 상세 보기 -->
    <div class="classroom-details">
      <div class="details-header">
        <div>
          <div class="details-title">{selectedClassroom.name}</div>
          <div style="color: #666; margin-top: 0.5rem;">
            {selectedClassroom.description || '설명이 없습니다'}
          </div>
        </div>
        <div class="details-actions">
          <button class="secondary-button" on:click={() => mode = 'list'}>
            <i class="fas fa-arrow-left"></i>
            목록으로
          </button>
          <button class="primary-button" on:click={openEditModal}>
            <i class="fas fa-edit"></i>
            교실 수정
          </button>
        </div>
      </div>

      <!-- 참여 코드 정보 -->
      <div class="join-code-display">
        <div style="margin-bottom: 0.5rem; font-weight: 600; color: #333;">
          학생 참여 코드
        </div>
        <div class="join-code">{selectedClassroom.joinCode}</div>
        <div class="code-actions">
          <button 
            class="code-button"
            on:click={() => copyJoinCode(selectedClassroom.joinCode)}
          >
            <i class="fas fa-copy"></i> 복사
          </button>
          <button 
            class="code-button"
            on:click={handleRegenerateJoinCode}
          >
            <i class="fas fa-redo"></i> 새 코드 생성
          </button>
        </div>
      </div>

      <!-- 교실 통계 -->
      <div class="classroom-stats">
        <div class="stat-item">
          <div class="stat-value">{activity.totalLessons}</div>
          <div class="stat-label">전체 수업</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{activity.activeLessons}</div>
          <div class="stat-label">활성 수업</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{activity.totalStudents}</div>
          <div class="stat-label">참여 학생</div>
        </div>
      </div>

      <!-- 수업 목록 -->
      {#if lessons.length > 0}
        <div class="lessons-section">
          <div class="section-title">최근 수업 목록</div>
          <div class="lessons-list">
            {#each lessons.slice(0, 5) as lesson}
              <div class="lesson-item">
                <div class="lesson-info">
                  <div class="lesson-title">{lesson.title}</div>
                  <div class="lesson-meta">
                    {lesson.subject} • 생성일: {formatDate(lesson.createdAt)}
                  </div>
                </div>
                <div class="lesson-status {lesson.status}">
                  {lesson.status === 'active' ? '진행 중' : '완료'}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div style="text-align: center; padding: 2rem; color: #666;">
          <i class="fas fa-chalkboard-teacher" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>아직 생성된 수업이 없습니다.</p>
          <p>새로운 수업을 만들어 시작해보세요!</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- 교실 생성 모달 -->
{#if showCreateModal}
  <div 
    class="modal" 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="create-modal-title"
    on:click={() => showCreateModal = false}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        showCreateModal = false;
      }
    }}
  >
    <div 
      class="modal-content" 
      role="document"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h3 id="create-modal-title" class="modal-title">새 교실 만들기</h3>
        <button class="close-button" on:click={() => showCreateModal = false}>×</button>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="classroom-name">교실 이름 *</label>
          <input 
            id="classroom-name"
            class="form-input"
            type="text" 
            bind:value={formData.name}
            placeholder="예: 3학년 1반"
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="classroom-description">교실 설명</label>
          <textarea 
            id="classroom-description"
            class="form-textarea"
            bind:value={formData.description}
            placeholder="교실에 대한 간단한 설명을 입력해주세요..."
            maxlength="200"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="max-students">수업당 최대 학생 수</label>
          <select id="max-students" class="form-select" bind:value={formData.maxStudentsPerLesson}>
            <option value={20}>20명</option>
            <option value={25}>25명</option>
            <option value={30}>30명</option>
            <option value={35}>35명</option>
            <option value={40}>40명</option>
          </select>
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

        <div class="form-group">
          <div class="checkbox-group">
            <input 
              id="auto-approve"
              type="checkbox" 
              bind:checked={formData.autoApproveJoin}
            />
            <label class="form-label" for="auto-approve">참여 요청 자동 승인</label>
          </div>
        </div>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="modal-actions">
        <button 
          class="cancel-button" 
          on:click={() => showCreateModal = false}
          disabled={management.isCreating}
        >
          취소
        </button>
        <button 
          class="submit-button"
          on:click={handleCreateClassroom}
          disabled={!formData.name.trim() || management.isCreating}
        >
          {#if management.isCreating}
            <i class="fas fa-spinner fa-spin"></i>
          {/if}
          교실 만들기
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- 교실 수정 모달 -->
{#if showEditModal}
  <div 
    class="modal" 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="edit-modal-title"
    on:click={() => showEditModal = false}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        showEditModal = false;
      }
    }}
  >
    <div 
      class="modal-content" 
      role="document"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h3 id="edit-modal-title" class="modal-title">교실 정보 수정</h3>
        <button class="close-button" on:click={() => showEditModal = false}>×</button>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="edit-classroom-name">교실 이름 *</label>
          <input 
            id="edit-classroom-name"
            class="form-input"
            type="text" 
            bind:value={formData.name}
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-classroom-description">교실 설명</label>
          <textarea 
            id="edit-classroom-description"
            class="form-textarea"
            bind:value={formData.description}
            maxlength="200"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="edit-max-students">수업당 최대 학생 수</label>
          <select id="edit-max-students" class="form-select" bind:value={formData.maxStudentsPerLesson}>
            <option value={20}>20명</option>
            <option value={25}>25명</option>
            <option value={30}>30명</option>
            <option value={35}>35명</option>
            <option value={40}>40명</option>
          </select>
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input 
              id="edit-allow-anonymous"
              type="checkbox" 
              bind:checked={formData.allowAnonymous}
            />
            <label class="form-label" for="edit-allow-anonymous">익명 참여 허용</label>
          </div>
        </div>

        <div class="form-group">
          <div class="checkbox-group">
            <input 
              id="edit-auto-approve"
              type="checkbox" 
              bind:checked={formData.autoApproveJoin}
            />
            <label class="form-label" for="edit-auto-approve">참여 요청 자동 승인</label>
          </div>
        </div>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="modal-actions">
        <button 
          class="cancel-button" 
          on:click={() => showEditModal = false}
          disabled={management.isLoading}
        >
          취소
        </button>
        <button 
          class="submit-button"
          on:click={handleUpdateClassroom}
          disabled={!formData.name.trim() || management.isLoading}
        >
          {#if management.isLoading}
            <i class="fas fa-spinner fa-spin"></i>
          {/if}
          수정 완료
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- 교실 삭제 확인 모달 -->
{#if showDeleteConfirm && classroomToDelete}
  <div 
    class="modal" 
    role="dialog" 
    aria-modal="true" 
    aria-labelledby="delete-modal-title"
    on:click={() => showDeleteConfirm = false}
    on:keydown={(e) => {
      if (e.key === 'Escape') {
        showDeleteConfirm = false;
      }
    }}
  >
    <div 
      class="modal-content" 
      role="document"
      on:click|stopPropagation
    >
      <div class="modal-header">
        <h3 id="delete-modal-title" class="modal-title">교실 삭제 확인</h3>
        <button class="close-button" on:click={() => showDeleteConfirm = false}>×</button>
      </div>

      <div style="margin-bottom: 2rem;">
        <p style="margin-bottom: 1rem;">
          <strong>"{classroomToDelete.name}"</strong> 교실을 삭제하시겠습니까?
        </p>
        <p style="color: #dc3545; font-size: 0.9rem;">
          ⚠️ 삭제된 교실은 보관함으로 이동되며, 관련된 모든 수업과 학생 데이터는 그대로 유지됩니다.
        </p>
      </div>

      <div class="modal-actions">
        <button 
          class="cancel-button" 
          on:click={() => showDeleteConfirm = false}
          disabled={management.isLoading}
        >
          취소
        </button>
        <button 
          class="submit-button"
          style="background: #dc3545;"
          on:click={handleDeleteClassroom}
          disabled={management.isLoading}
        >
          {#if management.isLoading}
            <i class="fas fa-spinner fa-spin"></i>
          {/if}
          삭제하기
        </button>
      </div>
    </div>
  </div>
{/if}