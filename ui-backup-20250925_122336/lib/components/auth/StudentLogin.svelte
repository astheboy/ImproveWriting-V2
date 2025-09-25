<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { auth, db } from '$lib/firebase/firebase';
  import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
  import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { withLoading, LoadingKeys } from '$lib/stores/loading';
  import { loadingStore } from '$lib/stores/loading';
  import { authService } from '$lib/stores/auth';
  import type { User } from '$lib/types';

  const dispatch = createEventDispatcher<{
    loginSuccess: { user: User };
    loginError: { error: string };
    showJoinCode: void;
    back: void;
  }>();

  $: isLoading = $loadingStore[LoadingKeys.LOGIN] || false;

  async function handleStudentGoogleLogin() {
    try {
      await withLoading(LoadingKeys.LOGIN, async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        // 학생이 이미 클래스에 참여했는지 확인
        const membershipQuery = query(
          collection(db, 'classMembers'), 
          where('userId', '==', result.user.uid)
        );
        const membershipSnapshot = await getDocs(membershipQuery);
        
        if (!membershipSnapshot.empty) {
          // 이미 클래스에 참여한 학생 - 역할 설정 후 학생 페이지로 이동
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            role: 'student', // 학생 역할 명시
            points: 0,
            level: 1,
            lastLogin: serverTimestamp()
          }, { merge: true });

          // AuthService를 통해 사용자 역할 업데이트
          await authService.updateUserRole('student');
          
          dispatch('loginSuccess', { 
            user: {
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
              role: 'student',
              points: 0,
              level: 1,
              badges: [],
              createdAt: serverTimestamp() as any,
              lastLogin: serverTimestamp() as any
            }
          });
        } else {
          // 아직 클래스에 참여하지 않은 학생 - 참여 코드 입력 요청
          dispatch('showJoinCode');
        }
      });
    } catch (error) {
      console.error('Student Google login error:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      dispatch('loginError', { error: errorMessage });
    }
  }

  function goBack() {
    dispatch('back');
  }
</script>

<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-8">
  <!-- 헤더 -->
  <div class="text-center">
    <div class="text-6xl mb-4">🎓</div>
    <h2 class="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
      학생으로 참여하기
    </h2>
    <p class="text-gray-600 text-lg">Google 계정으로 로그인해주세요</p>
  </div>

  <!-- 로그인 버튼 -->
  <div class="space-y-4">
    <button
      on:click={handleStudentGoogleLogin}
      disabled={isLoading}
      class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all transform hover:scale-105 disabled:scale-100 hover:shadow-2xl disabled:shadow-lg"
    >
      {#if isLoading}
        <div class="flex items-center justify-center space-x-3">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
          <span>로그인 중...</span>
        </div>
      {:else}
        <div class="flex items-center justify-center space-x-3">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Google로 로그인</span>
        </div>
      {/if}
    </button>

    <!-- 뒤로가기 버튼 -->
    <button
      on:click={goBack}
      disabled={isLoading}
      class="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-2xl transition-all"
    >
      뒤로가기
    </button>
  </div>

  <!-- 안내 메시지 -->
  <div class="text-center">
    <p class="text-sm text-gray-500">
      로그인 후 참여하고 싶은 클래스의<br>
      참여 코드를 입력하시면 됩니다.
    </p>
  </div>
</div>