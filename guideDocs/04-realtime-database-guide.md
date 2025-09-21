# 실시간 데이터베이스 연동 가이드 문서

## 📋 문서 개요

이 문서는 **상상력을 펼치는 글쓰기 V2** 프로젝트의 Firebase Firestore 실시간 데이터베이스 연동 시스템을 상세히 설명합니다. NoSQL 데이터 구조, CRUD 작업, 실시간 업데이트 메커니즘, 성능 최적화 등을 비전문가도 이해할 수 있도록 설명합니다.

---

## 🎯 Firestore 개요

### Firestore란 무엇인가요?

**Cloud Firestore**는 Google의 NoSQL 문서 기반 데이터베이스입니다:

- **문서 기반**: 데이터를 JSON과 유사한 문서 형태로 저장
- **실시간 동기화**: 데이터 변경 시 모든 연결된 클라이언트에 즉시 반영
- **자동 확장**: 사용량에 따라 자동으로 확장/축소
- **오프라인 지원**: 네트워크 연결이 끊어져도 로컬 캐시로 작업 가능

### 왜 Firestore를 선택했나요?

**교육 플랫폼의 특별한 요구사항:**
1. **실시간 협업**: 교사와 학생 간 즉시 동기화 필요
2. **확장성**: 학급 수가 증가해도 성능 저하 없음
3. **단순성**: 복잡한 서버 관리 없이 데이터 처리
4. **보안**: Google의 보안 인프라 활용

---

## 🏗️ 데이터 구조 설계

### 1. 전체 데이터베이스 구조

```
📁 Firestore Database (improvewriting-v2)
├── 👥 users                    # 사용자 정보
│   └── [userId]                # Google Auth UID
│       ├── uid: string
│       ├── email: string
│       ├── role: 'teacher'|'student'
│       └── ... (메타 정보)
│
├── 🏫 classrooms               # 클래스 정보
│   └── [classId]               # 자동 생성 ID
│       ├── className: string
│       ├── teacherId: string
│       ├── joinCode: string (6자리)
│       ├── studentCount: number
│       └── ... (클래스 메타데이터)
│
├── 🤝 classMembers             # 클래스 참여 관계
│   └── [memberId]              # 자동 생성 ID
│       ├── classId: string
│       ├── userId: string
│       ├── joinedAt: timestamp
│       └── ... (참여 메타데이터)
│
├── 📚 lessons                  # 수업/레슨 정보
│   └── [lessonId]              # 자동 생성 ID
│       ├── classId: string
│       ├── title: string
│       ├── type: string
│       ├── status: string
│       └── ... (수업 메타데이터)
│       │
│       └── 📊 [서브컬렉션들]
│           ├── sharedImages/   # 공유 이미지
│           ├── words/          # 단어 활동
│           ├── sentences/      # 문장 활동
│           ├── aiHelper/       # AI 도우미 대화
│           └── participants/   # 참여자 기록
│
└── ... (향후 확장)
```

**Q: 왜 이런 구조로 설계했나요?**
- **확장성**: 각 컬렉션이 독립적으로 확장 가능
- **성능**: 필요한 데이터만 조회하여 네트워크 비용 최소화
- **관계 관리**: 참조 ID를 통한 유연한 관계 설정
- **보안**: 컬렉션별로 다른 보안 규칙 적용 가능

---

## 📖 NoSQL 데이터 모델링

### 1. 문서 구조 패턴

#### A. 기본 문서 구조
```typescript
// users 컬렉션의 단일 문서 예시
{
  id: "abc123",                    // 문서 ID (자동 생성)
  uid: "firebase_auth_uid",        // Firebase Auth UID
  email: "teacher@school.com",     // 필수 필드
  displayName: "김선생님",         // 표시 이름
  role: "teacher",                 // 역할 구분자
  
  // 게임화 요소
  points: 150,                     // 현재 포인트
  level: 3,                        // 현재 레벨
  
  // 메타데이터
  createdAt: Timestamp,            // 생성 시각
  updatedAt: Timestamp,            // 마지막 업데이트
  isActive: true                   // 활성화 상태
}
```

#### B. 중복 저장 패턴 (Denormalization)
```typescript
// classrooms 문서에 교사 정보 중복 저장
{
  id: "class123",
  className: "3학년 1반",
  teacherId: "teacher_uid",
  teacherName: "김선생님",         // 중복 저장!
  teacherEmail: "kim@school.com",  // 중복 저장!
  
  // 클래스 메타데이터
  studentCount: 25,
  joinCode: "ABC123",
  createdAt: Timestamp
}
```

**Q: 왜 데이터를 중복 저장하나요?**
- **성능 최적화**: 매번 users 컬렉션을 조회할 필요 없음
- **읽기 비용 절약**: 한 번의 쿼리로 필요한 모든 정보 획득
- **UI 반응성**: 화면 렌더링 시간 단축
- **NoSQL 베스트 프랙티스**: 관계형 DB와 달리 중복 저장이 권장됨

### 2. 서브컬렉션 활용

```typescript
// lessons 문서 하위의 서브컬렉션 구조
lessons/[lessonId]/
├── (문서 자체)
│   ├── title: "봄 글쓰기"
│   ├── classId: "class123"
│   └── status: "active"
│
└── (서브컬렉션들)
    ├── sharedImages/[imageId]     # 수업에서 공유된 이미지들
    ├── words/[wordId]             # 단어 활동 데이터
    ├── sentences/[sentenceId]     # 문장 활동 데이터
    ├── aiHelper/[conversationId]  # AI 도우미 대화 기록
    └── participants/[participantId] # 참여자별 활동 기록
```

**서브컬렉션의 장점:**
- **논리적 그룹화**: 관련 데이터를 자연스럽게 묶음
- **보안**: 상위 문서와 다른 보안 규칙 적용 가능
- **성능**: 필요한 서브컬렉션만 선택적 조회
- **확장성**: 서브컬렉션 크기 제한 없음

---

## ⚡ 실시간 데이터 동기화

### 1. onSnapshot 실시간 리스너

#### A. 기본 패턴
```typescript
// src/lib/components/Dashboard.svelte
import { onSnapshot, collection, query, where } from 'firebase/firestore';

function loadClassrooms() {
  const classroomsRef = collection(db, 'classrooms');
  const q = query(classroomsRef, where('teacherId', '==', user.uid));
  
  // 실시간 리스너 설정
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // 변경사항이 있을 때마다 자동 호출됨
    classrooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('클래스 목록 업데이트:', classrooms.length, '개');
  }, (error) => {
    console.error('실시간 업데이트 오류:', error);
  });
  
  // 컴포넌트 제거 시 리스너 정리
  return unsubscribe;
}
```

#### B. 변경 타입 감지
```typescript
onSnapshot(collection(db, 'lessons'), (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const lesson = { id: change.doc.id, ...change.doc.data() };
    
    switch (change.type) {
      case 'added':
        console.log('새 수업 추가:', lesson.title);
        // 새 수업 추가 애니메이션
        break;
        
      case 'modified':
        console.log('수업 정보 변경:', lesson.title);
        // 변경 내용 하이라이트
        break;
        
      case 'removed':
        console.log('수업 삭제됨:', lesson.title);
        // 삭제 애니메이션
        break;
    }
  });
});
```

**실시간 동기화의 특징:**
- **즉시 반영**: 데이터 변경 시 1초 이내 모든 클라이언트 업데이트
- **효율적**: 변경된 문서만 네트워크로 전송
- **자동 재연결**: 네트워크 문제 시 자동으로 재연결 시도
- **오프라인 지원**: 오프라인 상태에서도 로컬 캐시로 작업 가능

### 2. 에러 처리 및 재연결

```typescript
function setupReliableListener(query, callback) {
  let retryCount = 0;
  const maxRetries = 5;
  
  function createListener() {
    const unsubscribe = onSnapshot(
      query, 
      callback,
      (error) => {
        console.error('실시간 리스너 오류:', error);
        
        // 네트워크 오류인 경우 재시도
        if (error.code === 'unavailable' && retryCount < maxRetries) {
          retryCount++;
          console.log(`재연결 시도 ${retryCount}/${maxRetries}`);
          
          // 지수 백오프로 재시도 지연
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            unsubscribe();
            createListener();
          }, delay);
        } else {
          // 복구 불가능한 오류 → 사용자에게 안내
          showErrorMessage('실시간 업데이트 연결이 끊어졌습니다.');
        }
      }
    );
    
    return unsubscribe;
  }
  
  return createListener();
}
```

---

## 🔧 CRUD 작업 패턴

### 1. 생성 (Create) 작업

#### A. 단일 문서 생성
```typescript
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

async function createClass() {
  try {
    const classData = {
      className: newClassName.trim(),
      teacherId: user.uid,
      teacherName: user.displayName,     // 중복 저장
      teacherEmail: user.email,          // 중복 저장
      joinCode: generateJoinCode(),
      studentCount: 0,
      maxStudents: 50,
      isActive: true,
      createdAt: serverTimestamp(),      // 서버 시간 사용
      updatedAt: serverTimestamp()
    };
    
    // Firestore에 문서 추가 (자동 ID 생성)
    const docRef = await addDoc(collection(db, 'classrooms'), classData);
    console.log('클래스 생성됨, ID:', docRef.id);
    
    return docRef;
  } catch (error) {
    console.error('클래스 생성 실패:', error);
    throw error;
  }
}
```

#### B. 배치 작업 (Batch Operations)
```typescript
import { writeBatch, doc } from 'firebase/firestore';

async function createMultipleStudents(students) {
  const batch = writeBatch(db);
  
  students.forEach((student, index) => {
    const studentRef = doc(collection(db, 'classMembers'));
    batch.set(studentRef, {
      classId: currentClassId,
      studentName: student.name,
      studentEmail: student.email,
      joinedAt: serverTimestamp(),
      orderIndex: index
    });
  });
  
  // 모든 작업을 원자적으로 실행
  await batch.commit();
  console.log('학생 일괄 추가 완료:', students.length, '명');
}
```

**Q: 언제 배치 작업을 사용해야 하나요?**
- **원자성**: 여러 작업이 모두 성공하거나 모두 실패해야 할 때
- **성능**: 여러 문서를 한 번에 처리할 때
- **비용**: 네트워크 요청 수 감소
- **일관성**: 관련된 문서들을 동시에 업데이트할 때

### 2. 읽기 (Read) 작업

#### A. 단일 문서 조회
```typescript
import { doc, getDoc } from 'firebase/firestore';

async function getClassData(classId: string) {
  try {
    const classRef = doc(db, 'classrooms', classId);
    const classSnap = await getDoc(classRef);
    
    if (classSnap.exists()) {
      const data = classSnap.data();
      console.log('클래스 데이터:', data);
      return { id: classSnap.id, ...data };
    } else {
      console.log('클래스를 찾을 수 없습니다.');
      return null;
    }
  } catch (error) {
    console.error('클래스 조회 실패:', error);
    throw error;
  }
}
```

#### B. 쿼리를 통한 다중 문서 조회
```typescript
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

async function getRecentLessons(classId: string, limitCount: number = 10) {
  try {
    const lessonsRef = collection(db, 'lessons');
    const q = query(
      lessonsRef,
      where('classId', '==', classId),        // 특정 클래스의
      where('status', '==', 'active'),       // 활성 상태인
      orderBy('createdAt', 'desc'),          // 최신순으로
      limit(limitCount)                      // 제한된 개수만
    );
    
    const querySnapshot = await getDocs(q);
    const lessons = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('최근 수업 조회:', lessons.length, '개');
    return lessons;
  } catch (error) {
    console.error('수업 조회 실패:', error);
    throw error;
  }
}
```

#### C. 복합 쿼리와 인덱스
```typescript
// firestore.indexes.json에서 정의된 복합 인덱스 활용
async function getFilteredLessons(classId: string, status: string) {
  const q = query(
    collection(db, 'lessons'),
    where('classId', '==', classId),     // 첫 번째 조건
    where('status', '==', status),       // 두 번째 조건
    orderBy('createdAt', 'desc')         // 정렬 (인덱스 필요!)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**복합 쿼리 주의사항:**
- **인덱스 필요**: 여러 필드를 조건으로 하는 쿼리는 복합 인덱스 필요
- **자동 생성**: 쿼리 실행 시 Firebase가 인덱스 생성 링크 제공
- **설정 파일**: `firestore.indexes.json`에서 인덱스 관리

### 3. 업데이트 (Update) 작업

#### A. 부분 업데이트
```typescript
import { doc, updateDoc, increment } from 'firebase/firestore';

async function updateClassStudentCount(classId: string, delta: number) {
  try {
    const classRef = doc(db, 'classrooms', classId);
    
    await updateDoc(classRef, {
      studentCount: increment(delta),      // 원자적 증감
      updatedAt: serverTimestamp()        // 업데이트 시간 갱신
    });
    
    console.log('학생 수 업데이트:', delta > 0 ? '추가' : '삭제');
  } catch (error) {
    console.error('학생 수 업데이트 실패:', error);
    throw error;
  }
}
```

#### B. 조건부 업데이트
```typescript
import { runTransaction } from 'firebase/firestore';

async function joinClassSafely(classId: string, userId: string) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. 클래스 정보 읽기
      const classRef = doc(db, 'classrooms', classId);
      const classDoc = await transaction.get(classRef);
      
      if (!classDoc.exists()) {
        throw new Error('클래스를 찾을 수 없습니다.');
      }
      
      const classData = classDoc.data();
      
      // 2. 참여 가능 여부 확인
      if (!classData.allowJoin) {
        throw new Error('참여가 허용되지 않은 클래스입니다.');
      }
      
      if (classData.studentCount >= classData.maxStudents) {
        throw new Error('참여 가능한 인원을 초과했습니다.');
      }
      
      // 3. 참여 처리 (원자적 실행)
      const memberRef = doc(collection(db, 'classMembers'));
      transaction.set(memberRef, {
        classId: classId,
        userId: userId,
        joinedAt: serverTimestamp()
      });
      
      // 4. 학생 수 증가
      transaction.update(classRef, {
        studentCount: increment(1)
      });
    });
    
    console.log('클래스 참여 성공');
  } catch (error) {
    console.error('클래스 참여 실패:', error);
    throw error;
  }
}
```

**트랜잭션의 중요성:**
- **원자성**: 모든 작업이 성공하거나 모두 실패
- **일관성**: 동시 접근 시 데이터 일관성 보장
- **격리성**: 다른 트랜잭션과 격리되어 실행
- **내구성**: 성공한 트랜잭션은 영구 저장

### 4. 삭제 (Delete) 작업

#### A. 단일 문서 삭제
```typescript
import { doc, deleteDoc } from 'firebase/firestore';

async function deleteLesson(lessonId: string) {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
    console.log('수업 삭제 완료:', lessonId);
  } catch (error) {
    console.error('수업 삭제 실패:', error);
    throw error;
  }
}
```

#### B. 계층적 삭제 (Cascading Delete)
```typescript
// ClassManagement.svelte에서 구현된 패턴
async function deleteLesson(lessonId: string, lessonTitle: string) {
  if (!confirm(`"${lessonTitle}" 수업을 삭제하시겠습니까?`)) return;
  
  try {
    const deletePromises = [];
    
    // 1. 서브컬렉션들 삭제
    const subCollections = ['sharedImages', 'words', 'sentences', 'aiHelper', 'participants'];
    
    for (const subCollectionName of subCollections) {
      const subCollectionRef = collection(db, `lessons/${lessonId}/${subCollectionName}`);
      const subCollectionSnapshot = await getDocs(subCollectionRef);
      
      subCollectionSnapshot.docs.forEach(subDoc => {
        deletePromises.push(deleteDoc(subDoc.ref));
      });
    }
    
    // 2. 모든 서브 데이터 삭제 실행
    await Promise.all(deletePromises);
    
    // 3. 수업 문서 자체 삭제
    await deleteDoc(doc(db, 'lessons', lessonId));
    
    console.log('수업 및 관련 데이터 삭제 완료');
  } catch (error) {
    console.error('수업 삭제 중 오류:', error);
    throw error;
  }
}
```

**Q: 왜 수동으로 서브컬렉션을 삭제해야 하나요?**
- **Firestore 특성**: 상위 문서 삭제 시 서브컬렉션은 자동 삭제되지 않음
- **의도적 설계**: 실수로 데이터를 잃는 것을 방지
- **명시적 정리**: 개발자가 의도적으로 관련 데이터 정리
- **비용 관리**: 사용하지 않는 데이터 누적 방지

---

## 🎯 성능 최적화 전략

### 1. 쿼리 최적화

#### A. 인덱스 활용
```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "classId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

#### B. 폴백 쿼리 패턴
```typescript
// ClassManagement.svelte에서 구현된 안전한 쿼리 패턴
function setupLessonListener() {
  try {
    // 이상적인 복합 쿼리 (인덱스 필요)
    const lessonsQuery = query(
      lessonsRef, 
      where('classId', '==', classData.id), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(lessonsQuery, handleSnapshot, (error) => {
      if (error.code === 'failed-precondition') {
        console.log('인덱스 준비 중, 폴백 쿼리 사용');
        useSimpleLessonQuery();  // 폴백 실행
      }
    });
    
    return unsubscribe;
  } catch (error) {
    useSimpleLessonQuery();
  }
}

function useSimpleLessonQuery() {
  // 인덱스 없이도 작동하는 간단한 쿼리
  const lessonsQuery = query(lessonsRef, where('classId', '==', classData.id));
  
  const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
    lessons = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        // 클라이언트에서 정렬 (성능 트레이드오프)
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
  });
  
  return unsubscribe;
}
```

### 2. 데이터 캐싱 전략

#### A. 클라이언트 사이드 캐싱
```typescript
// 자주 사용되는 데이터를 메모리에 캐시
let classroomCache = new Map();
let cacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

async function getCachedClassroom(classId: string) {
  const now = Date.now();
  const expiry = cacheExpiry.get(classId);
  
  // 캐시가 유효한 경우
  if (classroomCache.has(classId) && expiry > now) {
    return classroomCache.get(classId);
  }
  
  // 캐시 미스 또는 만료 → 새로 조회
  const classData = await getDoc(doc(db, 'classrooms', classId));
  const data = { id: classData.id, ...classData.data() };
  
  // 캐시 업데이트
  classroomCache.set(classId, data);
  cacheExpiry.set(classId, now + CACHE_DURATION);
  
  return data;
}
```

#### B. 오프라인 데이터 지속성
```typescript
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// 오프라인 모드 활성화
await disableNetwork(db);
console.log('오프라인 모드 활성화');

// 오프라인 상태에서도 로컬 캐시로 작업 가능
const lessons = await getDocs(lessonsQuery); // 로컬 캐시에서 조회

// 온라인 모드 복원
await enableNetwork(db);
console.log('온라인 모드 복원');
```

### 3. 쿼리 비용 최적화

#### A. 효율적인 쿼리 패턴
```typescript
// ❌ 비효율적: 모든 데이터를 가져온 후 필터링
const allLessons = await getDocs(collection(db, 'lessons'));
const activeLessons = allLessons.docs.filter(doc => doc.data().status === 'active');

// ✅ 효율적: 서버에서 필터링 후 가져오기
const activeLessonsQuery = query(
  collection(db, 'lessons'),
  where('status', '==', 'active')
);
const activeLessons = await getDocs(activeLessonsQuery);
```

#### B. 페이지네이션
```typescript
import { startAfter, limitToLast } from 'firebase/firestore';

class LessonPagination {
  private lastVisible: DocumentSnapshot | null = null;
  private pageSize = 10;
  
  async getFirstPage() {
    const q = query(
      collection(db, 'lessons'),
      orderBy('createdAt', 'desc'),
      limit(this.pageSize)
    );
    
    const snapshot = await getDocs(q);
    this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  async getNextPage() {
    if (!this.lastVisible) return [];
    
    const q = query(
      collection(db, 'lessons'),
      orderBy('createdAt', 'desc'),
      startAfter(this.lastVisible),
      limit(this.pageSize)
    );
    
    const snapshot = await getDocs(q);
    this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
```

---

## 🔒 보안 및 데이터 검증

### 1. 클라이언트 사이드 검증

#### A. 입력 데이터 검증
```typescript
interface ClassData {
  className: string;
  teacherId: string;
  maxStudents: number;
}

function validateClassData(data: Partial<ClassData>): ClassData {
  // 필수 필드 검증
  if (!data.className?.trim()) {
    throw new Error('클래스 이름은 필수입니다.');
  }
  
  if (data.className.length > 50) {
    throw new Error('클래스 이름이 너무 깁니다. (최대 50자)');
  }
  
  if (!data.teacherId) {
    throw new Error('교사 ID는 필수입니다.');
  }
  
  // 숫자 범위 검증
  const maxStudents = data.maxStudents || 30;
  if (maxStudents < 1 || maxStudents > 100) {
    throw new Error('최대 학생 수는 1-100명 사이여야 합니다.');
  }
  
  // 정제된 데이터 반환
  return {
    className: data.className.trim(),
    teacherId: data.teacherId,
    maxStudents: maxStudents
  };
}

// 사용 예시
async function createClass() {
  try {
    const validatedData = validateClassData({
      className: newClassName,
      teacherId: user.uid,
      maxStudents: 50
    });
    
    await addDoc(collection(db, 'classrooms'), validatedData);
  } catch (error) {
    alert(error.message);
  }
}
```

#### B. 권한 기반 데이터 접근
```typescript
async function getClassData(classId: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  
  const classDoc = await getDoc(doc(db, 'classrooms', classId));
  if (!classDoc.exists()) {
    throw new Error('클래스를 찾을 수 없습니다.');
  }
  
  const classData = classDoc.data();
  
  // 권한 확인: 교사이거나 참여 학생만 접근 가능
  if (classData.teacherId === user.uid) {
    // 교사 → 모든 데이터 접근 가능
    return { id: classDoc.id, ...classData };
  } else {
    // 학생 → 참여 여부 확인
    const memberQuery = query(
      collection(db, 'classMembers'),
      where('classId', '==', classId),
      where('userId', '==', user.uid),
      where('isActive', '==', true)
    );
    
    const memberSnapshot = await getDocs(memberQuery);
    if (memberSnapshot.empty) {
      throw new Error('이 클래스에 접근할 권한이 없습니다.');
    }
    
    // 학생용 제한된 정보만 반환
    return {
      id: classDoc.id,
      className: classData.className,
      teacherName: classData.teacherName
      // 민감한 정보 제외
    };
  }
}
```

### 2. Firebase Security Rules (향후 구현 예정)

```javascript
// firestore.rules 예시 (현재 미적용)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서: 본인만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 클래스룸: 교사만 생성/수정, 멤버만 읽기 가능
    match /classrooms/{classId} {
      allow create, update, delete: if request.auth != null 
        && request.auth.uid == resource.data.teacherId;
      
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.teacherId ||
        exists(/databases/$(database)/documents/classMembers/$(getClassMemberId(classId, request.auth.uid)))
      );
    }
    
    // 클래스 멤버: 참여자와 교사만 접근
    match /classMembers/{memberId} {
      allow read, write: if request.auth != null && (
        request.auth.uid == resource.data.userId ||
        request.auth.uid == getClassTeacherId(resource.data.classId)
      );
    }
    
    // 도우미 함수들
    function getClassMemberId(classId, userId) {
      return classId + '_' + userId;
    }
    
    function getClassTeacherId(classId) {
      return get(/databases/$(database)/documents/classrooms/$(classId)).data.teacherId;
    }
  }
}
```

---

## 📊 데이터 분석 및 모니터링

### 1. 사용 패턴 추적

```typescript
// 개발 환경에서 데이터베이스 사용량 모니터링
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';

class FirestoreMonitor {
  private readCount = 0;
  private writeCount = 0;
  private startTime = Date.now();
  
  logRead(collectionName: string, docCount: number) {
    this.readCount += docCount;
    console.log(`[Firestore] Read: ${collectionName} (${docCount} docs)`);
  }
  
  logWrite(collectionName: string, operation: string) {
    this.writeCount++;
    console.log(`[Firestore] Write: ${operation} in ${collectionName}`);
  }
  
  getUsageSummary() {
    const duration = Date.now() - this.startTime;
    return {
      reads: this.readCount,
      writes: this.writeCount,
      duration: duration,
      readsPerMinute: (this.readCount / duration) * 60000,
      writesPerMinute: (this.writeCount / duration) * 60000
    };
  }
}

const monitor = new FirestoreMonitor();

// 사용 예시
async function monitoredGetDocs(query) {
  const snapshot = await getDocs(query);
  monitor.logRead('lessons', snapshot.docs.length);
  return snapshot;
}
```

### 2. 에러 로깅 및 분석

```typescript
class FirestoreErrorTracker {
  private errors: any[] = [];
  
  logError(operation: string, error: any, context?: any) {
    const errorInfo = {
      operation,
      errorCode: error.code,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
      user: auth.currentUser?.uid,
      context
    };
    
    this.errors.push(errorInfo);
    console.error('[Firestore Error]', errorInfo);
    
    // 개발 환경에서 Firebase Analytics로 전송
    if (analytics && import.meta.env.DEV) {
      logEvent(analytics, 'firestore_error', {
        error_code: error.code,
        operation: operation
      });
    }
  }
  
  getErrorStats() {
    const errorCounts = this.errors.reduce((counts, error) => {
      counts[error.errorCode] = (counts[error.errorCode] || 0) + 1;
      return counts;
    }, {});
    
    return {
      totalErrors: this.errors.length,
      errorTypes: errorCounts,
      recentErrors: this.errors.slice(-10)
    };
  }
}

const errorTracker = new FirestoreErrorTracker();

// 에러 처리가 포함된 래퍼 함수
async function safeFirestoreOperation(operation: () => Promise<any>, operationName: string) {
  try {
    return await operation();
  } catch (error) {
    errorTracker.logError(operationName, error);
    throw error;
  }
}
```

---

## 🔧 개발 도구 및 디버깅

### 1. Firestore 디버깅 도구

```typescript
// 개발 환경에서 Firestore 상태 시각화
if (import.meta.env.DEV) {
  // 전역 디버그 객체
  window.firestoreDebug = {
    // 현재 활성 리스너들
    activeListeners: new Set(),
    
    // 리스너 등록
    addListener: (name: string, unsubscribe: () => void) => {
      window.firestoreDebug.activeListeners.add({ name, unsubscribe });
    },
    
    // 모든 리스너 해제
    clearAllListeners: () => {
      window.firestoreDebug.activeListeners.forEach(({ unsubscribe }) => {
        unsubscribe();
      });
      window.firestoreDebug.activeListeners.clear();
    },
    
    // 캐시 상태 확인
    getCacheStatus: () => ({
      classroomCache: classroomCache.size,
      cacheExpiry: cacheExpiry.size,
      timestamp: new Date().toISOString()
    })
  };
}
```

### 2. 성능 프로파일링

```typescript
class FirestoreProfiler {
  private operations: Map<string, any> = new Map();
  
  startOperation(operationId: string, description: string) {
    this.operations.set(operationId, {
      description,
      startTime: performance.now(),
      status: 'running'
    });
  }
  
  endOperation(operationId: string, result?: any) {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.endTime = performance.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.status = 'completed';
      operation.result = result;
      
      console.log(`[Firestore Profile] ${operation.description}: ${operation.duration.toFixed(2)}ms`);
    }
  }
  
  getSlowOperations(threshold: number = 1000) {
    return Array.from(this.operations.entries())
      .filter(([_, op]) => op.duration > threshold)
      .map(([id, op]) => ({ id, ...op }));
  }
}

const profiler = new FirestoreProfiler();

// 사용 예시
async function profiledQuery() {
  const operationId = 'load_lessons_' + Date.now();
  profiler.startOperation(operationId, 'Load lessons for class');
  
  try {
    const result = await getDocs(lessonsQuery);
    profiler.endOperation(operationId, result.docs.length);
    return result;
  } catch (error) {
    profiler.endOperation(operationId, { error: error.message });
    throw error;
  }
}
```

---

## ⚠️ 주의사항 및 베스트 프랙티스

### 1. 리스너 관리

```typescript
// ❌ 잘못된 패턴: 리스너 정리하지 않음
onMount(() => {
  onSnapshot(collection(db, 'data'), callback); // 메모리 누수!
});

// ✅ 올바른 패턴: 리스너 정리 보장
onMount(() => {
  const unsubscribe = onSnapshot(collection(db, 'data'), callback);
  return unsubscribe; // onDestroy에서 자동 호출됨
});
```

### 2. 서버 타임스탬프 사용

```typescript
// ❌ 클라이언트 시간 사용 (시간대 차이, 동기화 문제)
await addDoc(collection(db, 'events'), {
  createdAt: new Date(),
  timestamp: Date.now()
});

// ✅ 서버 타임스탬프 사용 (일관성 보장)
await addDoc(collection(db, 'events'), {
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

### 3. 쿼리 제한사항 이해

```typescript
// ❌ Firestore에서 지원하지 않는 쿼리
// - 여러 필드에 대한 != 조건
// - 배열과 부등호 조건 조합
// - OR 조건 (compound queries로 해결)

// ✅ 지원되는 패턴으로 변경
// OR 조건을 여러 쿼리로 분할
const query1 = query(collection(db, 'items'), where('status', '==', 'active'));
const query2 = query(collection(db, 'items'), where('status', '==', 'pending'));

const [result1, result2] = await Promise.all([
  getDocs(query1),
  getDocs(query2)
]);

const combinedResults = [...result1.docs, ...result2.docs];
```

---

## 📚 추가 학습 자료

1. **Firestore 공식 문서**: https://firebase.google.com/docs/firestore
2. **NoSQL 데이터 모델링**: https://firebase.google.com/docs/firestore/data-model
3. **Firestore 보안 규칙**: https://firebase.google.com/docs/firestore/security/get-started
4. **성능 모니터링**: https://firebase.google.com/docs/perf-mon
5. **오프라인 지원**: https://firebase.google.com/docs/firestore/manage-data/enable-offline

---

**이 가이드는 프로젝트의 Firestore 실시간 데이터베이스 연동을 이해하고 최적화하는 데 도움이 되도록 작성되었습니다. 새로운 데이터 구조나 쿼리를 추가할 때 이 문서의 패턴을 참조하여 성능과 일관성을 유지해주세요.**