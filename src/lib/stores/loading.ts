// 로딩 상태 관리 Store
import { writable, derived } from 'svelte/store';
import type { LoadingState } from '$lib/types';

// =============================================================================
// Store 정의
// =============================================================================
const loadingStore = writable<LoadingState>({});

// =============================================================================
// Derived Stores
// =============================================================================
export const isAnyLoading = derived(loadingStore, $loading => 
  Object.values($loading).some(loading => loading)
);

export const getLoadingCount = derived(loadingStore, $loading =>
  Object.values($loading).filter(loading => loading).length
);

// =============================================================================
// Actions
// =============================================================================
class LoadingService {
  /**
   * 특정 키의 로딩 상태 설정
   */
  setLoading(key: string, loading: boolean): void {
    loadingStore.update(state => ({
      ...state,
      [key]: loading
    }));
  }

  /**
   * 여러 키의 로딩 상태 일괄 설정
   */
  setMultipleLoading(loadingStates: Record<string, boolean>): void {
    loadingStore.update(state => ({
      ...state,
      ...loadingStates
    }));
  }

  /**
   * 특정 키의 로딩 상태 제거
   */
  removeLoading(key: string): void {
    loadingStore.update(state => {
      const { [key]: removed, ...rest } = state;
      return rest;
    });
  }

  /**
   * 모든 로딩 상태 초기화
   */
  clearAll(): void {
    loadingStore.set({});
  }

  /**
   * 비동기 작업 래퍼 - 자동으로 로딩 상태 관리
   */
  async withLoading<T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> {
    try {
      this.setLoading(key, true);
      return await asyncFn();
    } finally {
      this.setLoading(key, false);
    }
  }

  /**
   * 특정 키의 현재 로딩 상태 확인
   */
  isLoading(key: string): boolean {
    let currentState: LoadingState;
    const unsubscribe = loadingStore.subscribe(state => {
      currentState = state;
    });
    unsubscribe();
    return currentState![key] || false;
  }
}

// =============================================================================
// Export
// =============================================================================
export const loadingService = new LoadingService();

// 기본 store와 derived stores export
export { loadingStore };

// 편의를 위한 함수들
export const setLoading = (key: string, loading: boolean) => 
  loadingService.setLoading(key, loading);

export const withLoading = <T>(key: string, asyncFn: () => Promise<T>) => 
  loadingService.withLoading(key, asyncFn);

// 공통으로 사용되는 로딩 키들
export const LoadingKeys = {
  // 인증 관련
  LOGIN: 'login',
  LOGOUT: 'logout',
  USER_PROFILE: 'user-profile',
  
  // 클래스 관련
  CLASS_CREATE: 'class-create',
  CLASS_LIST: 'class-list',
  CLASS_DETAIL: 'class-detail',
  CLASS_UPDATE: 'class-update',
  CLASS_DELETE: 'class-delete',
  
  // 레슨 관련
  LESSON_CREATE: 'lesson-create',
  LESSON_LIST: 'lesson-list',
  LESSON_DETAIL: 'lesson-detail',
  LESSON_UPDATE: 'lesson-update',
  
  // 학생 관리
  STUDENT_LIST: 'student-list',
  STUDENT_JOIN: 'student-join',
  STUDENT_REMOVE: 'student-remove',
  
  // 기타
  QR_CODE_GENERATE: 'qr-generate',
  FILE_UPLOAD: 'file-upload',
  DATA_EXPORT: 'data-export'
} as const;