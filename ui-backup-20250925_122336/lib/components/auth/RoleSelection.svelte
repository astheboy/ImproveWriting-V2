<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    roleSelected: { role: 'teacher' | 'student' };
  }>();

  function selectRole(role: 'teacher' | 'student') {
    dispatch('roleSelected', { role });
  }
</script>

<div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 space-y-8">
  <!-- 헤더 -->
  <div class="text-center">
    <div class="text-6xl mb-4">🎆</div>
    <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
      상상력을 펼치며 글쓰기
    </h1>
    <p class="text-gray-600 text-lg">창의적인 글쓰기, 친구들과 함께해요!</p>
  </div>

  <!-- 역할 선택 버튼 -->
  <div class="space-y-4">
    <h2 class="text-xl font-bold text-center text-gray-700 mb-6">어떻게 사용하실가요?</h2>
    
    <!-- 학생 선택 -->
    <button 
      on:click={() => selectRole('student')}
      class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-6 rounded-2xl shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl"
    >
      <div class="flex items-center justify-center space-x-3">
        <span class="text-3xl">🎓</span>
        <div class="text-left">
          <div class="text-xl font-bold">학생으로 참여하기</div>
          <div class="text-sm opacity-90">선생님이 준 참여 코드를 입력하세요</div>
        </div>
      </div>
    </button>

    <!-- 교사 선택 -->
    <button 
      on:click={() => selectRole('teacher')}
      class="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6 rounded-2xl shadow-xl transition-all transform hover:scale-105 hover:shadow-2xl"
    >
      <div class="flex items-center justify-center space-x-3">
        <span class="text-3xl">🎑</span>
        <div class="text-left">
          <div class="text-xl font-bold">선생님 로그인</div>
          <div class="text-sm opacity-90">Google 계정으로 수업을 관리하세요</div>
        </div>
      </div>
    </button>
  </div>
</div>