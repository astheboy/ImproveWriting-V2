// 클래스 관리 서비스
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '$lib/firebase/firebase';
import { loadingService, LoadingKeys } from '$lib/stores/loading';
import type { 
  ClassData, 
  ClassMember 
} from '$lib/types';
import type { 
  ServiceResult, 
  ClassCreateRequest, 
  ClassUpdateRequest, 
  ClassStats, 
  ServiceError,
  ErrorCode
} from './types';
import { ERROR_CODES } from './types';

/**
 * 클래스 관리 서비스
 */
export class ClassService {
  private static instance: ClassService;
  private listeners: Map<string, Unsubscribe> = new Map();

  static getInstance(): ClassService {
    if (!ClassService.instance) {
      ClassService.instance = new ClassService();
    }
    return ClassService.instance;
  }

  /**
   * 에러 객체 생성 헬퍼
   */
  private createError(code: ErrorCode, message: string, details?: any): ServiceError {
    return { code, message, details };
  }

  /**
   * Firestore 에러를 서비스 에러로 변환
   */
  private handleFirestoreError(error: any): ServiceError {
    console.error('Firestore error:', error);
    
    if (error.code === 'permission-denied') {
      return this.createError(ERROR_CODES.PERMISSION_DENIED, '권한이 없습니다.');
    } else if (error.code === 'not-found') {
      return this.createError(ERROR_CODES.CLASS_NOT_FOUND, '클래스를 찾을 수 없습니다.');
    } else if (error.code === 'network-error') {
      return this.createError(ERROR_CODES.NETWORK_ERROR, '네트워크 오류가 발생했습니다.');
    } else {
      return this.createError(ERROR_CODES.UNKNOWN_ERROR, '알 수 없는 오류가 발생했습니다.', error);
    }
  }

  /**
   * 클래스 목록 조회 (교사용)
   */
  async getClassList(teacherId: string): Promise<ServiceResult<ClassData[]>> {
    try {
      return await loadingService.withLoading(LoadingKeys.CLASS_LIST, async () => {
        const classroomsRef = collection(db, 'classrooms');
        const q = query(
          classroomsRef, 
          where('teacherId', '==', teacherId),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const classes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClassData[];

        return { success: true, data: classes };
      });
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 클래스 상세 정보 조회
   */
  async getClassDetail(classId: string): Promise<ServiceResult<ClassData>> {
    try {
      return await loadingService.withLoading(LoadingKeys.CLASS_DETAIL, async () => {
        const classDoc = await getDoc(doc(db, 'classrooms', classId));
        
        if (!classDoc.exists()) {
          return { 
            success: false, 
            error: this.createError(ERROR_CODES.CLASS_NOT_FOUND, '클래스를 찾을 수 없습니다.') 
          };
        }

        const classData = { id: classDoc.id, ...classDoc.data() } as ClassData;
        return { success: true, data: classData };
      });
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 새 클래스 생성
   */
  async createClass(teacherId: string, request: ClassCreateRequest): Promise<ServiceResult<ClassData>> {
    try {
      return await loadingService.withLoading(LoadingKeys.CLASS_CREATE, async () => {
        // 6자리 랜덤 코드 생성
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const newClassData = {
          className: request.className,
          description: request.description || '',
          subject: request.subject || '',
          teacherId,
          joinCode,
          studentCount: 0,
          maxStudents: request.maxStudents || 50,
          isActive: true,
          allowJoin: true,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'classrooms'), newClassData);
        const createdClass = { id: docRef.id, ...newClassData } as ClassData;

        return { success: true, data: createdClass };
      });
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 클래스 정보 수정
   */
  async updateClass(classId: string, request: ClassUpdateRequest): Promise<ServiceResult<ClassData>> {
    try {
      return await loadingService.withLoading(LoadingKeys.CLASS_UPDATE, async () => {
        const classRef = doc(db, 'classrooms', classId);
        const updates = {
          ...request,
          updatedAt: serverTimestamp()
        };

        await updateDoc(classRef, updates);
        
        // 업데이트된 데이터 반환
        const result = await this.getClassDetail(classId);
        return result;
      });
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 클래스 삭제 (소프트 삭제)
   */
  async deleteClass(classId: string): Promise<ServiceResult<void>> {
    try {
      return await loadingService.withLoading(LoadingKeys.CLASS_DELETE, async () => {
        const classRef = doc(db, 'classrooms', classId);
        await updateDoc(classRef, {
          isActive: false,
          deletedAt: serverTimestamp()
        });

        return { success: true };
      });
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 클래스 참여 (학생용)
   */
  async joinClass(userId: string, classId: string, userInfo: Pick<ClassMember, 'displayName' | 'email' | 'photoURL'>): Promise<ServiceResult<void>> {
    try {
      return await loadingService.withLoading(LoadingKeys.STUDENT_JOIN, async () => {
        // 클래스 존재 및 참여 가능 여부 확인
        const classResult = await this.getClassDetail(classId);
        if (!classResult.success || !classResult.data) {
          return classResult as ServiceResult<void>;
        }

        const classData = classResult.data;
        if (!classData.allowJoin || !classData.isActive) {
          return {
            success: false,
            error: this.createError(ERROR_CODES.CLASS_FULL, '현재 참여할 수 없는 클래스입니다.')
          };
        }

        // 이미 참여했는지 확인
        const memberRef = doc(db, 'classMembers', `${classId}_${userId}`);
        const memberDoc = await getDoc(memberRef);
        
        if (memberDoc.exists()) {
          return {
            success: false,
            error: this.createError(ERROR_CODES.USER_ALREADY_EXISTS, '이미 참여한 클래스입니다.')
          };
        }

        // 멤버십 생성
        const memberData: ClassMember = {
          id: `${classId}_${userId}`,
          classId,
          userId,
          userRole: 'student',
          displayName: userInfo.displayName,
          email: userInfo.email,
          photoURL: userInfo.photoURL,
          joinedAt: serverTimestamp() as any,
          lastActiveAt: serverTimestamp() as any,
          totalActivities: 0,
          totalWords: 0,
          totalSentences: 0,
          totalLikes: 0
        };

        await addDoc(collection(db, 'classMembers'), memberData);

        // 클래스 학생 수 업데이트
        await updateDoc(doc(db, 'classrooms', classId), {
          studentCount: (classData.studentCount || 0) + 1
        });

        return { success: true };
      });
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 클래스 통계 조회
   */
  async getClassStats(classId: string): Promise<ServiceResult<ClassStats>> {
    try {
      // 멤버 수 조회
      const membersRef = collection(db, 'classMembers');
      const membersQuery = query(membersRef, where('classId', '==', classId));
      const membersSnapshot = await getDocs(membersQuery);
      
      const totalStudents = membersSnapshot.size;
      // 임시로 기본값 반환 (실제로는 더 복잡한 계산 필요)
      const stats: ClassStats = {
        totalStudents,
        activeStudents: Math.floor(totalStudents * 0.8), // 임시값
        totalLessons: 0, // 레슨 컬렉션에서 계산
        completedLessons: 0, // 레슨 컬렉션에서 계산  
        averageParticipation: 75 // 임시값
      };

      return { success: true, data: stats };
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }

  /**
   * 클래스 실시간 구독
   */
  subscribeToClass(classId: string, callback: (classData: ClassData | null) => void): () => void {
    const unsubscribe = onSnapshot(
      doc(db, 'classrooms', classId),
      (snapshot) => {
        if (snapshot.exists()) {
          const classData = { id: snapshot.id, ...snapshot.data() } as ClassData;
          callback(classData);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Class subscription error:', error);
        callback(null);
      }
    );

    // 구독 해제 함수 저장
    this.listeners.set(`class_${classId}`, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * 모든 구독 해제
   */
  unsubscribeAll(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

// 싱글톤 인스턴스 export
export const classService = ClassService.getInstance();