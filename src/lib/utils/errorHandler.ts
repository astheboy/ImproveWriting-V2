// 통합 에러 처리 시스템
import { writable } from 'svelte/store';
import type { ErrorState } from '$lib/types';

// =============================================================================
// 에러 상태 관리
// =============================================================================
const errorStore = writable<ErrorState | null>(null);

// =============================================================================
// 에러 처리 클래스
// =============================================================================
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorState[] = [];
  private displayDuration = 5000; // 5초

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 에러 표시
   */
  show(error: string | ErrorState): void {
    const errorState: ErrorState = typeof error === 'string' 
      ? { message: error, timestamp: new Date() }
      : error;

    // 에러 큐에 추가
    this.errorQueue.push(errorState);
    
    // Store 업데이트
    errorStore.set(errorState);

    // 자동 숨김
    setTimeout(() => {
      this.hide();
    }, this.displayDuration);
  }

  /**
   * 에러 숨김
   */
  hide(): void {
    errorStore.set(null);
    
    // 큐에서 제거하고 다음 에러 표시
    if (this.errorQueue.length > 0) {
      this.errorQueue.shift();
      if (this.errorQueue.length > 0) {
        const nextError = this.errorQueue[0];
        errorStore.set(nextError);
        setTimeout(() => this.hide(), this.displayDuration);
      }
    }
  }

  /**
   * 모든 에러 지우기
   */
  clear(): void {
    this.errorQueue = [];
    errorStore.set(null);
  }

  /**
   * Firebase 에러 메시지 한국어 변환
   */
  translateFirebaseError(error: any): string {
    const errorCode = error?.code || '';
    
    switch (errorCode) {
      case 'auth/user-not-found':
        return '등록되지 않은 사용자입니다.';
      case 'auth/wrong-password':
        return '비밀번호가 올바르지 않습니다.';
      case 'auth/email-already-in-use':
        return '이미 사용중인 이메일입니다.';
      case 'auth/weak-password':
        return '비밀번호가 너무 약합니다.';
      case 'auth/network-request-failed':
        return '네트워크 연결을 확인해주세요.';
      case 'auth/too-many-requests':
        return '너무 많은 시도입니다. 잠시 후 다시 시도해주세요.';
      case 'auth/popup-closed-by-user':
        return '로그인 창이 닫혔습니다.';
      case 'auth/cancelled-popup-request':
        return '로그인이 취소되었습니다.';
      case 'permission-denied':
        return '권한이 없습니다.';
      case 'not-found':
        return '요청한 데이터를 찾을 수 없습니다.';
      case 'already-exists':
        return '이미 존재하는 데이터입니다.';
      case 'resource-exhausted':
        return '요청 한도를 초과했습니다.';
      case 'failed-precondition':
        return '사전 조건이 충족되지 않았습니다.';
      case 'aborted':
        return '작업이 중단되었습니다.';
      case 'out-of-range':
        return '유효하지 않은 범위입니다.';
      case 'unimplemented':
        return '구현되지 않은 기능입니다.';
      case 'internal':
        return '서버 내부 오류가 발생했습니다.';
      case 'unavailable':
        return '서비스를 사용할 수 없습니다.';
      case 'data-loss':
        return '데이터 손실이 발생했습니다.';
      case 'unauthenticated':
        return '인증이 필요합니다.';
      default:
        return error?.message || '알 수 없는 오류가 발생했습니다.';
    }
  }

  /**
   * 컨텍스트와 함께 에러 로깅
   */
  log(error: any, context: string, additionalInfo?: any): void {
    const errorInfo = {
      error: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      additionalInfo
    };

    console.error(`[${context}]`, errorInfo);

    // 프로덕션 환경에서는 외부 로깅 서비스로 전송
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // 예: Sentry, LogRocket 등으로 전송
      this.sendToLoggingService(errorInfo);
    }
  }

  /**
   * 외부 로깅 서비스로 전송 (구현 예시)
   */
  private sendToLoggingService(errorInfo: any): void {
    // 실제 구현에서는 Sentry, LogRocket 등의 서비스 사용
    try {
      fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      }).catch(err => {
        console.error('Failed to send error to logging service:', err);
      });
    } catch (err) {
      console.error('Failed to send error to logging service:', err);
    }
  }

  /**
   * 비동기 함수 에러 래퍼
   */
  async wrap<T>(
    asyncFn: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T> {
    try {
      return await asyncFn();
    } catch (error) {
      this.log(error, context);
      const translatedError = this.translateFirebaseError(error);
      this.show(translatedError);
      
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  /**
   * 에러 재시도 래퍼
   */
  async withRetry<T>(
    asyncFn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context: string = 'unknown'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;
        this.log(error, `${context} (attempt ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
          // 지수 백오프 적용
          const delay = delayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 모든 재시도 실패
    const translatedError = this.translateFirebaseError(lastError);
    this.show(`${translatedError} (${maxRetries}번 재시도 후 실패)`);
    throw lastError;
  }
}

// =============================================================================
// Export
// =============================================================================
export const errorHandler = ErrorHandler.getInstance();

// Store export
export { errorStore };

// 편의 함수들
export const showError = (error: string | ErrorState) => errorHandler.show(error);
export const hideError = () => errorHandler.hide();
export const logError = (error: any, context: string, additionalInfo?: any) => 
  errorHandler.log(error, context, additionalInfo);

// 데코레이터 스타일 래퍼 (선택적 사용)
export const withErrorHandling = (context: string) => {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod?.apply(this, args);
      } catch (error) {
        errorHandler.log(error, `${context}.${propertyKey}`);
        const translatedError = errorHandler.translateFirebaseError(error);
        errorHandler.show(translatedError);
        throw error;
      }
    } as T;
    
    return descriptor;
  };
};