<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { db } from '$lib/firebase/firebase';
  import { collection, query, where, getDocs } from 'firebase/firestore';
  import { withLoading, LoadingKeys } from '$lib/stores/loading';
  import { loadingStore } from '$lib/stores/loading';

  const dispatch = createEventDispatcher<{
    joinSuccess: { classId: string };
    joinError: { error: string };
    back: void;
  }>();

  let joinCode = '';
  let errorMessage = '';

  $: isLoading = $loadingStore[LoadingKeys.STUDENT_JOIN] || false;

  async function handleJoinWithCode(event: Event) {
    event.preventDefault();
    
    if (!joinCode.trim()) {
      errorMessage = '참여 코드를 입력해주세요.';
      return;
    }

    try {
      await withLoading(LoadingKeys.STUDENT_JOIN, async () => {
        // 클래스 존재 확인
        const classroomsRef = collection(db, 'classrooms');
        const q = query(classroomsRef, where('joinCode', '==', joinCode.toUpperCase()));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          errorMessage = '존재하지 않는 참여 코드입니다.';
          return;
        }

        const classDoc = querySnapshot.docs[0];
        dispatch('joinSuccess', { classId: classDoc.id });
      });
    } catch (error) {
      console.error('Join with code error:', error);
      const errorMsg = error instanceof Error ? error.message : '참여에 실패했습니다.';
      errorMessage = errorMsg;
      dispatch('joinError', { error: errorMsg });
    }
  }

  function goBack() {
    dispatch('back');
  }

  // 에러 메시지 자동 숨김
  $: if (errorMessage) {
    setTimeout(() => errorMessage = '', 3000);
  }

  // 입력값 변경 시 에러 메시지 초기화
  $: if (joinCode) {
    errorMessage = '';
  }
</script>

<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-8">
  <!-- 헤더 -->
  <div class="text-center">
    <div class="text-6xl mb-4">🔑</div>
    <h2 class="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
      참여 코드 입력
    </h2>
    <p class="text-gray-600 text-lg">선생님이 알려준 참여 코드를 입력하세요</p>
  </div>

  <!-- 참여 코드 입력 폼 -->
  <form on:submit={handleJoinWithCode} class="space-y-6">
    <div>
      <label for="joinCode" class="block text-sm font-medium text-gray-700 mb-2">
        참여 코드 (6자리)
      </label>
      <input
        id="joinCode"
        type="text"
        bind:value={joinCode}
        placeholder="ABC123"
        maxlength="6"
        class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono uppercase tracking-wider"
        class:border-red-300={errorMessage}
        class:focus:ring-red-500={errorMessage}
        disabled={isLoading}
        style="text-transform: uppercase;"
      />
      {#if errorMessage}
        <p class="mt-2 text-sm text-red-600 text-center">{errorMessage}</p>
      {/if}
    </div>

    <div class="space-y-3">
      <!-- 참여하기 버튼 -->
      <button
        type="submit"
        disabled={isLoading || !joinCode.trim()}
        class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all transform hover:scale-105 disabled:scale-100 hover:shadow-2xl disabled:shadow-lg"
      >
        {#if isLoading}
          <div class="flex items-center justify-center space-x-3">
            <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            <span>참여 중...</span>
          </div>
        {:else}
          <div class="flex items-center justify-center space-x-3">
            <span class="text-xl">🚀</span>
            <span>클래스에 참여하기</span>
          </div>
        {/if}
      </button>

      <!-- 뒤로가기 버튼 -->
      <button
        type="button"
        on:click={goBack}
        disabled={isLoading}
        class="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-2xl transition-all"
      >
        뒤로가기
      </button>
    </div>
  </form>

  <!-- 도움말 -->
  <div class="text-center">
    <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <span class="text-blue-400 text-xl">💡</span>
        </div>
        <div class="ml-3">
          <p class="text-sm text-blue-700">
            <strong>참여 코드는 어디에 있나요?</strong><br>
            선생님이 화면에 표시한 6자리 코드를 입력하거나,<br>
            QR 코드를 스캔하면 자동으로 입력됩니다.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>