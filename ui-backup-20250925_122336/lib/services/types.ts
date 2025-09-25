// 서비스 계층 타입 정의
import type { ClassData, User, LessonData } from '$lib/types';

// =============================================================================
// API 엔드포인트 상수
// =============================================================================
export const API_ENDPOINTS = {
  // 클래스 관리
  CLASS_LIST: '/api/classes',
  CLASS_DETAIL: (id: string) => `/api/classes/${id}`,
  CLASS_UPDATE: (id: string) => `/api/classes/${id}`,
  CLASS_DELETE: (id: string) => `/api/classes/${id}`,
  CLASS_STATS: (id: string) => `/api/classes/${id}/stats`,
  CLASS_PARTICIPATION: (id: string) => `/api/classes/${id}/participation`,
  
  // 학생 관리
  STUDENT_LIST: (classId: string) => `/api/classes/${classId}/students`,
  STUDENT_DETAIL: (classId: string, studentId: string) => `/api/classes/${classId}/students/${studentId}`,
  STUDENT_REMOVE: (classId: string, studentId: string) => `/api/classes/${classId}/students/${studentId}`,
  
  // 분석 및 내보내기
  ANALYTICS: '/api/analytics',
  EXPORT: '/api/export'
} as const;

// =============================================================================
// 서비스 응답 타입
// =============================================================================
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

// =============================================================================
// 클래스 서비스 타입
// =============================================================================
export interface ClassCreateRequest {
  className: string;
  description?: string;
  subject?: string;
  maxStudents?: number;
}

export interface ClassUpdateRequest {
  className?: string;
  description?: string;
  subject?: string;
  maxStudents?: number;
  isActive?: boolean;
  allowJoin?: boolean;
}

export interface ClassStats {
  totalStudents: number;
  activeStudents: number;
  totalLessons: number;
  completedLessons: number;
  averageParticipation: number;
}

// =============================================================================
// 사용자 서비스 타입
// =============================================================================
export interface UserCreateRequest {
  email: string;
  displayName: string;
  role: 'teacher' | 'student';
  photoURL?: string;
}

export interface UserUpdateRequest {
  displayName?: string;
  role?: 'teacher' | 'student';
  points?: number;
  level?: number;
  badges?: string[];
}

// =============================================================================
// 인증 서비스 타입
// =============================================================================
export interface LoginRequest {
  provider: 'google' | 'anonymous';
  role?: 'teacher' | 'student';
}

export interface LoginResponse {
  user: User;
  accessToken?: string;
  refreshToken?: string;
}

// =============================================================================
// 에러 코드 상수
// =============================================================================
export const ERROR_CODES = {
  // 인증 관련
  AUTHENTICATION_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // 클래스 관련
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  CLASS_FULL: 'CLASS_FULL',
  INVALID_JOIN_CODE: 'INVALID_JOIN_CODE',
  
  // 사용자 관련
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  
  // 일반적인 에러
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];