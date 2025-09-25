// 인증 상태 관리 Store
import { writable, derived, get } from 'svelte/store';
import { auth, db } from '$lib/firebase/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import type { User, AuthState } from '$lib/types';

// =============================================================================
// Store 정의
// =============================================================================
const initialAuthState: AuthState = {
  user: null,
  isLoading: true,
  error: null
};

const authStore = writable<AuthState>(initialAuthState);

// =============================================================================
// Derived Stores (computed values)
// =============================================================================
export const user = derived(authStore, $auth => $auth.user);
export const isAuthenticated = derived(authStore, $auth => !!$auth.user);
export const isLoading = derived(authStore, $auth => $auth.isLoading);
export const authError = derived(authStore, $auth => $auth.error);
export const userRole = derived(authStore, $auth => $auth.user?.role || null);

// =============================================================================
// Actions (상태 변경 함수들)
// =============================================================================
class AuthService {
  private initialized = false;

  /**
   * Firebase 인증 상태 변화 구독 시작
   */
  initialize(): () => void {
    if (this.initialized) {
      console.warn('AuthService already initialized');
      return () => {};
    }

    this.initialized = true;
    
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await this.loadUserData(firebaseUser);
          authStore.set({
            user: userData,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Failed to load user data:', error);
          authStore.set({
            user: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        authStore.set({
          user: null,
          isLoading: false,
          error: null
        });
      }
    });
  }

  /**
   * Firebase User를 App User로 변환하고 DB에서 추가 정보 로드
   */
  private async loadUserData(firebaseUser: FirebaseUser): Promise<User> {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: userData.role || 'student',
        points: userData.points || 0,
        level: userData.level || 1,
        badges: userData.badges || [],
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin || serverTimestamp(),
        // 선택적 필드들
        schoolName: userData.schoolName,
        teachingSubjects: userData.teachingSubjects,
        grade: userData.grade,
        studentId: userData.studentId
      };
    } else {
      // 새 사용자인 경우 기본 데이터 생성
      const defaultUserData: Omit<User, 'uid' | 'email' | 'displayName' | 'photoURL'> = {
        role: 'student', // 기본값
        points: 0,
        level: 1,
        badges: [],
        createdAt: serverTimestamp() as any,
        lastLogin: serverTimestamp() as any
      };

      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        ...defaultUserData
      };

      // Firestore에 사용자 데이터 저장
      await setDoc(userRef, {
        ...newUser,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }, { merge: true });

      return newUser;
    }
  }

  /**
   * 사용자 역할 업데이트
   */
  async updateUserRole(role: 'teacher' | 'student'): Promise<void> {
    const currentState = get(authStore);
    if (!currentState.user) {
      throw new Error('No user logged in');
    }

    try {
      const userRef = doc(db, 'users', currentState.user.uid);
      await setDoc(userRef, { 
        role,
        lastLogin: serverTimestamp()
      }, { merge: true });

      // Store 업데이트
      authStore.update(state => ({
        ...state,
        user: state.user ? { ...state.user, role } : null
      }));
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const currentState = get(authStore);
    if (!currentState.user) {
      throw new Error('No user logged in');
    }

    try {
      const userRef = doc(db, 'users', currentState.user.uid);
      await setDoc(userRef, {
        ...updates,
        lastLogin: serverTimestamp()
      }, { merge: true });

      // Store 업데이트
      authStore.update(state => ({
        ...state,
        user: state.user ? { ...state.user, ...updates } : null
      }));
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  /**
   * 로딩 상태 수동 설정
   */
  setLoading(loading: boolean): void {
    authStore.update(state => ({
      ...state,
      isLoading: loading
    }));
  }

  /**
   * 에러 상태 수동 설정
   */
  setError(error: string | null): void {
    authStore.update(state => ({
      ...state,
      error
    }));
  }

  /**
   * 인증 상태 초기화
   */
  reset(): void {
    authStore.set(initialAuthState);
  }
}

// =============================================================================
// Export
// =============================================================================
export const authService = new AuthService();

// 기본 store도 export (필요한 경우)
export { authStore };

// 편의를 위한 헬퍼 함수들
export const getCurrentUser = (): User | null => get(user);
export const isUserAuthenticated = (): boolean => get(isAuthenticated);
export const getUserRole = (): 'teacher' | 'student' | null => get(userRole);

// 인증이 필요한 작업을 수행하는 헬퍼
export const requireAuth = <T extends any[]>(
  fn: (user: User, ...args: T) => any
) => {
  return (...args: T) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }
    return fn(currentUser, ...args);
  };
};