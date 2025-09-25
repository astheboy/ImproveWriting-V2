# TypeScript 기초 문법 가이드

## 목차
1. [TypeScript란 무엇인가?](#typescript란-무엇인가)
2. [타입 정의 (Type Definitions)](#타입-정의-type-definitions)
3. [인터페이스 (Interface)](#인터페이스-interface)
4. [클래스 (Class)](#클래스-class)
5. [제네릭 (Generic)](#제네릭-generic)
6. [유니언 타입 (Union Types)](#유니언-타입-union-types)
7. [옵셔널 프로퍼티 (Optional Properties)](#옵셔널-프로퍼티-optional-properties)
8. [함수 타입 (Function Types)](#함수-타입-function-types)
9. [모듈과 Import/Export](#모듈과-importexport)
10. [유틸리티 타입 (Utility Types)](#유틸리티-타입-utility-types)

---

## TypeScript란 무엇인가?

TypeScript는 JavaScript에 **타입 안정성**을 제공하는 프로그래밍 언어입니다. 

**왜 TypeScript를 사용할까요?**
- 코드 작성 중 오류를 미리 발견할 수 있습니다
- IDE에서 더 나은 자동완성을 제공합니다
- 대규모 프로젝트에서 코드 유지보수가 쉬워집니다
- 팀 협업 시 코드의 의도를 명확히 전달할 수 있습니다

우리 프로젝트에서는 사용자 정보, 수업 데이터, Firebase 통신 등 복잡한 데이터를 다루기 때문에 TypeScript의 타입 안정성이 매우 중요합니다.

---

## 타입 정의 (Type Definitions)

### 기본 타입들

```typescript
// src/lib/types/index.ts에서 발췌
export interface User {
  uid: string;              // 문자열 타입
  email: string | null;     // 문자열이거나 null
  displayName: string | null;
  photoURL: string | null;
  role: 'teacher' | 'student';  // 특정 문자열만 허용
  points: number;           // 숫자 타입
  level: number;
  badges?: string[];        // 문자열 배열 (선택적)
  createdAt: Timestamp;     // Firebase의 Timestamp 타입
  lastLogin: Timestamp;
}
```

**해설:**
- `string`: 텍스트 데이터
- `number`: 숫자 데이터
- `boolean`: 참/거짓 값
- `string | null`: "문자열 또는 null" 이라는 의미
- `'teacher' | 'student'`: 오직 이 두 문자열만 허용
- `string[]`: 문자열들로 이루어진 배열
- `badges?`: `?`가 있으면 선택적 프로퍼티 (없어도 됨)

---

## 인터페이스 (Interface)

인터페이스는 객체의 **구조를 정의**하는 도구입니다.

```typescript
// src/lib/types/index.ts
export interface ClassData {
  id: string;
  className: string;
  description?: string;      // 선택적
  subject?: string;         // 선택적
  teacherId: string;
  teacherName: string;
  joinCode: string;
  studentCount: number;
  maxStudents: number;
  isActive: boolean;
  allowJoin: boolean;
  createdAt: Timestamp | Date;  // Timestamp 또는 Date 타입
  updatedAt?: Timestamp | Date; // 선택적
}
```

**실제 사용 예시:**
```typescript
// src/lib/services/classService.ts
async getClassDetail(classId: string): Promise<ServiceResult<ClassData>> {
  const classData = { id: classDoc.id, ...classDoc.data() } as ClassData;
  // classData는 이제 ClassData 인터페이스의 모든 속성을 가져야 함
  return { success: true, data: classData };
}
```

**왜 인터페이스를 사용할까요?**
- 객체가 어떤 속성을 가져야 하는지 명확히 정의
- 실수로 잘못된 속성명을 사용하는 것을 방지
- 코드 에디터에서 자동완성 지원

---

## 클래스 (Class)

클래스는 **관련된 데이터와 기능을 묶어서** 관리하는 도구입니다.

```typescript
// src/lib/services/classService.ts
export class ClassService {
  private static instance: ClassService;           // 정적 속성
  private listeners: Map<string, Unsubscribe> = new Map();  // 비공개 속성

  // 싱글톤 패턴 구현
  static getInstance(): ClassService {
    if (!ClassService.instance) {
      ClassService.instance = new ClassService();
    }
    return ClassService.instance;
  }

  // 에러 처리 메소드 (비공개)
  private createError(code: ErrorCode, message: string, details?: any): ServiceError {
    return { code, message, details };
  }

  // 클래스 목록 조회 메소드 (공개)
  async getClassList(teacherId: string): Promise<ServiceResult<ClassData[]>> {
    try {
      // 실제 구현 로직...
      const classes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassData[];

      return { success: true, data: classes };
    } catch (error) {
      return { 
        success: false, 
        error: this.handleFirestoreError(error) 
      };
    }
  }
}
```

**클래스의 주요 개념들:**

1. **접근 제어자**:
   - `public`: 외부에서 접근 가능 (기본값)
   - `private`: 클래스 내부에서만 접근 가능
   - `static`: 인스턴스가 아닌 클래스 자체에 속함

2. **싱글톤 패턴**:
   - 하나의 인스턴스만 생성되도록 보장
   - 애플리케이션 전체에서 동일한 서비스 객체 사용

---

## 제네릭 (Generic)

제네릭은 **재사용 가능한 컴포넌트**를 만들 때 사용합니다.

```typescript
// src/lib/types/index.ts
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;                 // T는 제네릭 타입 매개변수
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// src/lib/services/types.ts
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;                 // 어떤 타입이든 될 수 있음
  error?: ServiceError;
}
```

**실제 사용 예시:**
```typescript
// 클래스 목록을 받을 때
Promise<ServiceResult<ClassData[]>>

// 단일 클래스를 받을 때  
Promise<ServiceResult<ClassData>>

// 아무것도 반환하지 않을 때
Promise<ServiceResult<void>>
```

**제네릭의 장점:**
- 같은 구조를 가지지만 다른 데이터 타입을 다룰 때 유용
- 코드 중복을 피하면서 타입 안정성 유지
- `ServiceResult<ClassData>`와 `ServiceResult<User>`는 구조는 같지만 data의 타입이 다름

---

## 유니언 타입 (Union Types)

여러 타입 중 **하나가 될 수 있음**을 표현합니다.

```typescript
// src/lib/types/index.ts
export interface User {
  email: string | null;     // 문자열이거나 null
  role: 'teacher' | 'student';  // 'teacher' 또는 'student'만 가능
}

export interface ClassData {
  createdAt: Timestamp | Date;  // Firebase Timestamp 또는 JavaScript Date
}

// src/lib/utils/errorHandler.ts
show(error: string | ErrorState): void {
  const errorState: ErrorState = typeof error === 'string' 
    ? { message: error, timestamp: new Date() }
    : error;
}
```

**실제 활용:**
```typescript
// 사용자가 로그인하지 않았을 수도 있음
user: User | null;

// 에러는 문자열이거나 에러 객체일 수 있음  
error: string | ErrorState;

// 사용자 역할은 교사 또는 학생만 가능
role: 'teacher' | 'student';
```

---

## 옵셔널 프로퍼티 (Optional Properties)

**있어도 되고 없어도 되는** 속성을 표현합니다.

```typescript
// src/lib/types/index.ts
export interface User {
  uid: string;              // 필수
  email: string | null;     // 필수 (null일 수는 있지만 반드시 있어야 함)
  
  // 선택적 속성들 (교사에게만 해당)
  schoolName?: string;      // 있어도 되고 없어도 됨
  teachingSubjects?: string[];

  // 선택적 속성들 (학생에게만 해당)  
  grade?: string;
  studentId?: string;
}

export interface ClassCreateRequest {
  className: string;        // 필수
  description?: string;     // 선택적
  subject?: string;         // 선택적
  maxStudents?: number;     // 선택적
}
```

**왜 옵셔널 프로퍼티를 사용할까요?**
- 교사와 학생이 다른 속성을 가지지만 같은 User 인터페이스를 사용
- 클래스 생성 시 필수 정보만 받고 나머지는 선택적으로 받음
- API 요청에서 일부 필드만 업데이트할 때 유용

---

## 함수 타입 (Function Types)

함수의 **입력과 출력 타입**을 정의합니다.

```typescript
// src/lib/stores/auth.ts

// 함수의 매개변수와 반환 타입 정의
async updateUserRole(role: 'teacher' | 'student'): Promise<void> {
  // role은 'teacher' 또는 'student'만 받음
  // Promise<void>는 아무것도 반환하지 않는 비동기 함수
}

// 제네릭을 사용한 함수 타입
export const requireAuth = <T extends any[]>(
  fn: (user: User, ...args: T) => any    // 함수를 매개변수로 받음
) => {
  return (...args: T) => {               // 함수를 반환
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Authentication required');
    }
    return fn(currentUser, ...args);
  };
};
```

**콜백 함수 타입:**
```typescript
// src/lib/services/classService.ts
subscribeToClass(
  classId: string, 
  callback: (classData: ClassData | null) => void  // 콜백 함수 타입 정의
): () => void {  // 구독 해제 함수를 반환
  // 구현...
}
```

**에러 처리 함수:**
```typescript
// src/lib/utils/errorHandler.ts
async wrap<T>(
  asyncFn: () => Promise<T>,    // 비동기 함수를 받음
  context: string,              // 컨텍스트 문자열
  fallback?: T                  // 선택적 기본값
): Promise<T> {                 // T 타입을 반환
  // 구현...
}
```

---

## 모듈과 Import/Export

TypeScript에서 **코드를 모듈로 나누고** 재사용하는 방법입니다.

```typescript
// src/lib/types/index.ts - 타입 정의 모듈
import type { Timestamp } from 'firebase/firestore';  // 외부 라이브러리 타입 가져오기

export interface User { ... }          // 인터페이스 내보내기
export interface ClassData { ... }     // 인터페이스 내보내기
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];  // 타입 별칭 내보내기
```

```typescript
// src/lib/services/classService.ts - 서비스 모듈
import { 
  collection, 
  doc, 
  getDoc,
  // ... Firebase 함수들
} from 'firebase/firestore';

import { db } from '$lib/firebase/firebase';           // 내부 모듈
import type { ClassData, ClassMember } from '$lib/types';  // 타입만 가져오기

export class ClassService { ... }                     // 클래스 내보내기
export const classService = ClassService.getInstance();  // 인스턴스 내보내기
```

```typescript
// src/lib/firebase/firebase.ts - Firebase 설정 모듈
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';             // 같은 폴더의 파일

export const app = initializeApp(firebaseConfig);     // 초기화된 앱 내보내기
export const auth = getAuth(app);                     // 인증 객체 내보내기
export const db = getFirestore(app);                  // 데이터베이스 객체 내보내기
```

**Import/Export 패턴들:**

1. **Named Export/Import**:
```typescript
// 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);

// 가져오기  
import { auth, db } from '$lib/firebase/firebase';
```

2. **Type-only Import**:
```typescript
// 타입만 가져오기 (런타임에 포함되지 않음)
import type { User, ClassData } from '$lib/types';
```

3. **Default Export/Import**:
```typescript
// 내보내기
export default defineConfig({
  plugins: [sveltekit()]
});

// 가져오기
import { defineConfig } from 'vite';
```

---

## 유틸리티 타입 (Utility Types)

기존 타입을 **변형해서 새로운 타입**을 만드는 도구입니다.

```typescript
// src/lib/types/index.ts
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

**내장 유틸리티 타입들:**

1. **Partial<T>** - 모든 속성을 선택적으로 만듦:
```typescript
// src/lib/stores/auth.ts
async updateUserProfile(updates: Partial<User>): Promise<void> {
  // User의 모든 속성이 선택적이 됨
  // { displayName?: string, role?: 'teacher'|'student', ... }
}
```

2. **Pick<T, K>** - 특정 속성만 선택:
```typescript
// src/lib/services/classService.ts  
async joinClass(
  userId: string, 
  classId: string, 
  userInfo: Pick<ClassMember, 'displayName' | 'email' | 'photoURL'>
): Promise<ServiceResult<void>> {
  // ClassMember에서 3개 속성만 선택해서 사용
}
```

3. **Omit<T, K>** - 특정 속성을 제외:
```typescript
// src/lib/stores/auth.ts
const defaultUserData: Omit<User, 'uid' | 'email' | 'displayName' | 'photoURL'> = {
  // User에서 4개 속성을 제외한 나머지 속성만 가짐
  role: 'student',
  points: 0,
  level: 1,
  // ...
};
```

4. **ReturnType<T>** - 함수의 반환 타입 추출:
```typescript
// src/lib/firebase/firebase.ts
export let analytics: ReturnType<typeof getAnalytics> | null = null;
// getAnalytics 함수의 반환 타입을 자동으로 추출
```

---

## 실전 활용 팁

### 1. 타입 가드 (Type Guards)
```typescript
// src/lib/utils/errorHandler.ts
show(error: string | ErrorState): void {
  const errorState: ErrorState = typeof error === 'string' 
    ? { message: error, timestamp: new Date() }
    : error;
  // typeof를 사용해서 타입을 구분
}
```

### 2. 타입 단언 (Type Assertion)
```typescript
// src/lib/services/classService.ts  
const classes = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
})) as ClassData[];
// as ClassData[]로 타입을 명시적으로 지정
```

### 3. 상수 객체의 타입
```typescript
// src/lib/services/types.ts
export const ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  // ...
} as const;  // as const로 읽기 전용 만들기

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
// ERROR_CODES의 값들로 타입 생성
```

### 4. 조건부 타입
```typescript
// src/lib/types/index.ts
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  //                    조건부 타입: object면 재귀, 아니면 그대로
};
```

---

## 프로젝트에서 TypeScript가 도움이 되는 부분들

### 1. **데이터 일관성 보장**
- User, ClassData 등의 인터페이스로 데이터 구조 통일
- Firebase에서 받은 데이터의 타입 검증

### 2. **API 안정성**  
- ServiceResult<T> 제네릭으로 일관된 응답 형식
- 에러 코드 상수로 오타 방지

### 3. **개발 생산성**
- IDE 자동완성으로 빠른 개발
- 컴파일 타임 에러 검출로 런타임 오류 감소

### 4. **팀 협업**
- 명확한 타입 정의로 코드 의도 전달
- 인터페이스 변경 시 관련 코드 자동 감지

이처럼 TypeScript는 단순한 문법이 아니라 **안정적이고 유지보수하기 좋은 코드**를 작성하는 도구입니다. 처음에는 복잡해 보일 수 있지만, 프로젝트가 커질수록 그 가치를 실감하게 됩니다.