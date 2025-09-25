<!--
  학생용 수업 참여 페이지
  - 참여 코드 입력
  - 실시간 수업 활동 참여
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { auth } from '$lib/firebase/firebase';
  import { signInAnonymously } from 'firebase/auth';
  import StudentInterface from '$lib/components/StudentInterface.svelte';
  import { resetAllStores } from '$lib/stores';

  let mode = 'join'; // 'join' | 'active'
  let user = null;

  onMount(async () => {
    try {
      // 익명 사용자로 로그인
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      user = auth.currentUser;
      
    } catch (error) {
      console.error('익명 로그인 오류:', error);
    }
  });

  onDestroy(() => {
    // 페이지 종료시 스토어 초기화
    resetAllStores();
  });

  /**
   * 수업 참여 완료 처리
   */
  function handleJoined(event) {
    mode = 'active';
    console.log('수업 참여 완료:', event.detail);
  }

  /**
   * 수업 나가기 처리
   */
  function handleLeft(event) {
    mode = 'join';
    console.log('수업 나감');
  }
</script>

<style>
  .student-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }

  .page-header {
    text-align: center;
    color: white;
    margin-bottom: 2rem;
    padding: 2rem 1rem;
  }

  .logo {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .content-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .footer {
    text-align: center;
    color: rgba(255, 255, 255, 0.8);
    padding: 2rem 1rem;
    font-size: 0.9rem;
  }

  .footer-links {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .footer-link {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    transition: color 0.2s;
  }

  .footer-link:hover {
    color: white;
  }

  /* 반응형 */
  @media (max-width: 768px) {
    .logo {
      font-size: 2rem;
    }
    
    .subtitle {
      font-size: 1rem;
    }
    
    .footer-links {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>

<svelte:head>
  <title>학생 참여 - 상상력을 펼치는 글쓰기</title>
</svelte:head>

<div class="student-page">
  <!-- 페이지 헤더 -->
  <div class="page-header">
    <div class="logo">
      상상력을 펼치는 글쓰기
    </div>
    <div class="subtitle">
      창의적인 글쓰기의 즐거운 여행을 시작해보세요
    </div>
  </div>

  <!-- 메인 컨텐츠 -->
  <div class="content-container">
    <StudentInterface 
      {mode}
      on:joined={handleJoined}
      on:left={handleLeft}
    />
  </div>

  <!-- 페이지 푸터 -->
  <div class="footer">
    <div class="footer-links">
      <a href="/" class="footer-link">홈으로</a>
      <a href="/teacher" class="footer-link">교사용 페이지</a>
    </div>
    <div>
      © 2024 상상력을 펼치는 글쓰기 V2. 모든 권리 보유.
    </div>
  </div>
</div>