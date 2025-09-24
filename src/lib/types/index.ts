// 프로젝트 핵심 타입 정의
import type { Timestamp } from 'firebase/firestore';

// =============================================================================
// 사용자 관련 타입
// =============================================================================
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'teacher' | 'student';
  points: number;
  level: number;
  badges?: string[];
  createdAt: Timestamp;
  lastLogin: Timestamp;
  
  // 교사 전용 필드
  schoolName?: string;
  teachingSubjects?: string[];
  
  // 학생 전용 필드
  grade?: string;
  studentId?: string;
}

// =============================================================================
// 클래스 관련 타입
// =============================================================================
export interface ClassData {
  id: string;
  className: string;
  description?: string;
  subject?: string;
  teacherId: string;
  teacherName: string;
  joinCode: string;
  qrCode?: string;
  qrCodeUrl?: string;
  studentCount: number;
  maxStudents: number;
  isActive: boolean;
  allowJoin: boolean;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ClassMember {
  id: string;
  classId: string;
  userId: string;
  userRole: 'teacher' | 'student';
  displayName: string;
  email: string;
  photoURL?: string;
  joinedAt: Timestamp;
  lastActiveAt: Timestamp;
  totalActivities?: number;
  totalWords?: number;
  totalSentences?: number;
  totalLikes?: number;
}

// =============================================================================
// 수업 관련 타입
// =============================================================================
export interface LessonData {
  id: string;
  classId: string;
  title: string;
  description: string;
  lessonType: 'writing' | 'vocabulary' | 'discussion';
  teacherId: string;
  teacherName: string;
  status: 'planned' | 'active' | 'completed' | 'archived';
  currentPhase: 'waiting' | 'images_only' | 'word_input_active' | 'sentence_input_active' | 'completed';
  participantCount: number;
  participants: string[];
  sharedImages?: {
    url1: string;
    alt1: string;
    url2: string;
    alt2: string;
    updatedAt: Timestamp;
  };
  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}

export interface WordData {
  id: string;
  lessonId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
}

export interface SentenceData {
  id: string;
  lessonId: string;
  text: string;
  authorId: string;
  authorName: string;
  likesBy: string[];
  createdAt: Timestamp;
}

// =============================================================================
// 상태 관리 타입
// =============================================================================
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  message: string;
  code?: string;
  timestamp: Date;
}

// =============================================================================
// API 응답 타입
// =============================================================================
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// =============================================================================
// 컴포넌트 Props 타입
// =============================================================================
export interface LoginProps {
  redirectTo?: string;
}

export interface DashboardProps {
  user: User;
}

export interface ClassManagementProps {
  classData: ClassData;
}

// =============================================================================
// 이벤트 타입
// =============================================================================
export interface AuthStateChangeEvent {
  user: User | null;
  isInitialized: boolean;
}

export interface ClassCreateEvent {
  classData: ClassData;
}

export interface ClassJoinEvent {
  classId: string;
  userId: string;
}

// =============================================================================
// 유틸리티 타입
// =============================================================================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;