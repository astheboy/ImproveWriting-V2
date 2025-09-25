// 공통 유틸리티 함수들
import { Timestamp } from 'firebase/firestore';

// =============================================================================
// 날짜/시간 관련 유틸리티
// =============================================================================

/**
 * Firestore Timestamp를 Date로 변환
 */
export function timestampToDate(timestamp: Timestamp | Date | any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
}

/**
 * 상대 시간 표시 (예: "5분 전", "2시간 전")
 */
export function formatRelativeTime(date: Date | Timestamp | any): string {
  const targetDate = timestampToDate(date);
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return targetDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * 한국어 날짜 포맷팅
 */
export function formatDate(date: Date | Timestamp | any, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const targetDate = timestampToDate(date);
  
  switch (format) {
    case 'short':
      return targetDate.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    case 'medium':
      return targetDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    case 'long':
      return targetDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    default:
      return targetDate.toLocaleDateString('ko-KR');
  }
}

/**
 * 시간 포맷팅
 */
export function formatTime(date: Date | Timestamp | any, includeSeconds = false): string {
  const targetDate = timestampToDate(date);
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  if (includeSeconds) {
    options.second = '2-digit';
  }
  
  return targetDate.toLocaleTimeString('ko-KR', options);
}

// =============================================================================
// 문자열 관련 유틸리티
// =============================================================================

/**
 * 문자열 자르기 (한글 지원)
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 문자열을 안전한 슬러그로 변환
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, ''); // 앞뒤 하이픈 제거
}

/**
 * 참여 코드 생성
 */
export function generateJoinCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리기 쉬운 문자 제외
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 이메일 마스킹 (개인정보 보호)
 */
export function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  } else {
    return `${local.substring(0, 2)}***@${domain}`;
  }
}

// =============================================================================
// 숫자 관련 유틸리티
// =============================================================================

/**
 * 숫자를 한국어 단위로 포맷팅 (예: 1,234 → 1.2천)
 */
export function formatNumber(num: number, compact = false): string {
  if (compact) {
    if (num >= 100000000) { // 1억 이상
      return `${(num / 100000000).toFixed(1)}억`;
    } else if (num >= 10000) { // 1만 이상
      return `${(num / 10000).toFixed(1)}만`;
    } else if (num >= 1000) { // 1천 이상
      return `${(num / 1000).toFixed(1)}천`;
    }
  }
  return num.toLocaleString('ko-KR');
}

/**
 * 백분율 계산
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * 범위 내 값 제한
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// =============================================================================
// 배열 관련 유틸리티
// =============================================================================

/**
 * 배열 셔플 (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 배열에서 고유값만 추출
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * 배열을 특정 크기로 청크 분할
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// =============================================================================
// 객체 관련 유틸리티
// =============================================================================

/**
 * 깊은 복사
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as any;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 객체의 빈 값 제거
 */
export function removeEmptyValues(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '' && value !== 0) {
      result[key] = value;
    }
  }
  
  return result;
}

// =============================================================================
// URL/파일 관련 유틸리티
// =============================================================================

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 파일 확장자 추출
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * URL 파라미터 파싱
 */
export function getUrlParams(url?: string): Record<string, string> {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(targetUrl);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

// =============================================================================
// 브라우저 관련 유틸리티
// =============================================================================

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 폴백: 임시 textarea 사용
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

/**
 * 로컬 스토리지 안전 사용
 */
export const localStorage = {
  get(key: string, defaultValue: any = null): any {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('localStorage.get error:', error);
      return defaultValue;
    }
  },
  
  set(key: string, value: any): boolean {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('localStorage.set error:', error);
      return false;
    }
  },
  
  remove(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('localStorage.remove error:', error);
      return false;
    }
  }
};

// =============================================================================
// 개발자 도구
// =============================================================================

/**
 * 디바운스 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 쓰로틀 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}