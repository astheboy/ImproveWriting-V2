<!--
  교사용 통합 대시보드 페이지
  - 교실 관리
  - 수업 생성 및 진행
  - 실시간 모니터링
-->
<script>
  import { onMount } from 'svelte';
  import { auth } from '$lib/firebase/firebase';
  import { 
    initializeTeacherDashboard,
    resetAllStores,
    currentClassroom,
    teacherClassrooms,
    currentLesson
  } from '$lib/stores';
  import ClassroomManager from '$lib/components/ClassroomManager.svelte';
  import LessonCreator from '$lib/components/LessonCreator.svelte';
  import LessonDashboard from '$lib/components/LessonDashboard.svelte';

  // 페이지 상태
  let activeTab = 'classrooms'; // 'classrooms' | 'lesson-create' | 'lesson-manage'
  let selectedClassroomId = '';
  let selectedLessonId = '';
  let user = null;

  // 반응형 상태들
  $: classroom = $currentClassroom;
  $: classrooms = $teacherClassrooms;
  $: lesson = $currentLesson;

  onMount(async () => {
    // 인증 상태 확인
    if (auth.currentUser) {
      user = auth.currentUser;
      // 교사 대시보드 초기화
      await initializeTeacherDashboard(user.uid);
    } else {
      // 로그인 페이지로 리디렉션
      window.location.href = '/';
    }

    return () => {
      // 페이지 종료시 모든 스토어 초기화
      resetAllStores();
    };
  });

  /**
   * 탭 변경
   */
  function changeTab(newTab) {
    activeTab = newTab;
  }

  /**
   * 교실 선택 처리
   */
  function handleClassroomSelected(event) {
    selectedClassroomId = event.detail.classroomId;
    console.log('교실 선택됨:', event.detail);
  }

  /**
   * 수업 생성 완료 처리
   */
  function handleLessonCreated(event) {
    selectedLessonId = event.detail.id;
    activeTab = 'lesson-manage';
    console.log('수업 생성 완료:', event.detail);
  }

  /**
   * 로그아웃
   */
  async function handleLogout() {
    try {
      resetAllStores();
      await auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }
</script>

<style>
  .teacher-page {
    min-height: 100vh;
    background: #f8f9fa;
  }

  .page-header {
    background: white;
    border-bottom: 1px solid #e9ecef;
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: #4285f4;
  }

  .nav-tabs {
    display: flex;
    gap: 2rem;
  }

  .nav-tab {
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
  }

  .nav-tab:hover {
    color: #4285f4;
  }

  .nav-tab.active {
    color: #4285f4;
    border-bottom-color: #4285f4;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #4285f4;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .user-name {
    color: #333;
    font-weight: 500;
  }

  .logout-button {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }

  .logout-button:hover {
    background: #c82333;
  }

  .page-content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .tab-content {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .welcome-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 3rem 2rem;
    border-radius: 16px;
    margin-bottom: 2rem;
    text-align: center;
  }

  .welcome-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .welcome-subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 2rem;
  }

  .stats-row {
    display: flex;
    justify-content: center;
    gap: 3rem;
    margin-top: 2rem;
  }

  .stat-item {
    text-align: center;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    opacity: 0.8;
    font-size: 0.9rem;
  }

  /* 반응형 */
  @media (max-width: 768px) {
    .page-header {
      padding: 1rem;
    }
    
    .header-content {
      flex-direction: column;
      gap: 1rem;
    }
    
    .nav-tabs {
      gap: 1rem;
    }
    
    .page-content {
      padding: 1rem;
    }
    
    .welcome-section {
      padding: 2rem 1rem;
    }
    
    .welcome-title {
      font-size: 2rem;
    }
    
    .stats-row {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>

<svelte:head>
  <title>교사 대시보드 - 상상력을 펼치는 글쓰기</title>
</svelte:head>

<div class="teacher-page">
  <!-- 페이지 헤더 -->
  <div class="page-header">
    <div class="header-content">
      <div class="logo">
        상상력을 펼치는 글쓰기 V2
      </div>
      
      <nav class="nav-tabs">
        <button 
          class="nav-tab {activeTab === 'classrooms' ? 'active' : ''}"
          on:click={() => changeTab('classrooms')}
        >
          <i class="fas fa-school"></i>
          교실 관리
        </button>
        
        <button 
          class="nav-tab {activeTab === 'lesson-create' ? 'active' : ''}"
          on:click={() => changeTab('lesson-create')}
          disabled={!selectedClassroomId}
        >
          <i class="fas fa-plus"></i>
          수업 생성
        </button>
        
        <button 
          class="nav-tab {activeTab === 'lesson-manage' ? 'active' : ''}"
          on:click={() => changeTab('lesson-manage')}
          disabled={!selectedLessonId}
        >
          <i class="fas fa-chalkboard-teacher"></i>
          수업 진행
        </button>
      </nav>
      
      <div class="user-info">
        {#if user}
          <div class="user-profile">
            <div class="user-avatar">
              {user.displayName ? user.displayName.charAt(0) : user.email.charAt(0)}
            </div>
            <div class="user-name">
              {user.displayName || user.email}
            </div>
          </div>
        {/if}
        <button class="logout-button" on:click={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  </div>

  <!-- 페이지 컨텐츠 -->
  <div class="page-content">
    {#if activeTab === 'classrooms'}
      <div class="tab-content">
        <!-- 환영 섹션 -->
        <div class="welcome-section">
          <div class="welcome-title">안녕하세요, 선생님!</div>
          <div class="welcome-subtitle">
            창의적인 글쓰기 수업을 시작해보세요
          </div>
          
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-number">{classrooms.length}</div>
              <div class="stat-label">관리 중인 교실</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{classrooms.filter(c => c.status === 'active').length}</div>
              <div class="stat-label">활성 교실</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">
                {classrooms.reduce((total, c) => total + (c.totalLessons || 0), 0)}
              </div>
              <div class="stat-label">총 수업 수</div>
            </div>
          </div>
        </div>
        
        <!-- 교실 관리 -->
        <ClassroomManager 
          selectedClassroomId={selectedClassroomId}
          on:classroomSelected={handleClassroomSelected}
        />
      </div>
      
    {:else if activeTab === 'lesson-create'}
      <div class="tab-content">
        <LessonCreator 
          classroomId={selectedClassroomId}
          mode="create"
          on:lessonCreated={handleLessonCreated}
        />
      </div>
      
    {:else if activeTab === 'lesson-manage'}
      <div class="tab-content">
        <LessonDashboard 
          lessonId={selectedLessonId}
        />
      </div>
    {/if}
  </div>
</div>