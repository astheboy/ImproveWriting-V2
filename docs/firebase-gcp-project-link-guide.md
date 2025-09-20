# Firebase와 Google Cloud 프로젝트 연결 가이드

## 🎯 목표
Firebase 프로젝트와 Google Cloud Console 프로젝트를 올바르게 연결하여 OAuth 인증 문제를 해결합니다.

## 🔍 현재 상태 확인

### Step 1: Firebase 프로젝트 정보 확인
1. **Firebase Console** (https://console.firebase.google.com) 접속
2. 현재 프로젝트 선택
3. **Project Settings** (설정 아이콘) 클릭
4. **General** 탭에서 다음 정보 확인:
   - **Project ID**: (예: `improvewriting-v2-abc123`)
   - **Project number**: (예: `123456789012`)
   - **Web API Key**: (예: `AIzaSy...`)

### Step 2: Google Cloud Console 프로젝트 확인
1. **Google Cloud Console** (https://console.cloud.google.com) 접속
2. 상단 프로젝트 선택 드롭다운 클릭
3. 현재 선택된 프로젝트 ID 확인

## 🔗 프로젝트 연결 방법

### 방법 1: Firebase 프로젝트가 이미 Google Cloud와 연결된 경우

#### 1-1. 올바른 Google Cloud 프로젝트 선택
1. **Google Cloud Console**에서 상단 프로젝트 드롭다운 클릭
2. **Firebase 프로젝트와 동일한 Project ID**를 찾아서 선택
3. 프로젝트 ID는 Firebase Console의 Project Settings에서 확인한 것과 일치해야 함

#### 1-2. 프로젝트 연결 상태 확인
Firebase 프로젝트는 생성 시 자동으로 Google Cloud 프로젝트와 연결됩니다:
```
Firebase Project ID = Google Cloud Project ID
```

### 방법 2: 새 Firebase 프로젝트 생성 시 Google Cloud 프로젝트 연결

#### 2-1. 기존 Google Cloud 프로젝트 활용
1. **Firebase Console**에서 **Create a project** 또는 **Add project** 클릭
2. **Enter your project name** 단계에서 하단에 있는 **Advanced options** 클릭
3. **Google Cloud Platform (GCP) resource location** 설정
4. 기존 Google Cloud 프로젝트를 선택할 수 있는 옵션이 표시됨

#### 2-2. 새 프로젝트 생성 (권장)
현재 상황에서는 새로운 통합 프로젝트를 생성하는 것이 가장 안전합니다.

## 🛠️ 실제 해결 단계

### Step 1: 현재 프로젝트 정보 수집

**Firebase Console에서:**
```
Project Settings → General 탭
- Project ID: [여기에 기록]
- Project number: [여기에 기록]
- Web API Key: [여기에 기록]
```

**Google Cloud Console에서:**
```
상단 프로젝트 선택기
- 현재 선택된 Project ID: [여기에 기록]
- Project Number: [여기에 기록]
```

### Step 2: 연결 상태 확인

두 프로젝트의 **Project ID**와 **Project Number**가 일치하는지 확인:

- ✅ **일치하는 경우**: 이미 연결됨 → OAuth 설정만 추가하면 됨
- ❌ **불일치하는 경우**: 연결되지 않음 → 아래 Step 3 진행

### Step 3: 불일치 시 해결 방법

#### 옵션 A: Google Cloud에서 올바른 프로젝트 선택
1. Google Cloud Console 상단에서 프로젝트 드롭다운 클릭
2. Firebase Project ID와 일치하는 프로젝트 검색 및 선택
3. 해당 프로젝트가 없다면 옵션 B 진행

#### 옵션 B: 새 Firebase 프로젝트 생성 (권장)
기존 설정의 복잡성을 피하고 깔끔하게 시작:

1. **새 Firebase 프로젝트 생성**
   ```
   Firebase Console → Add project
   프로젝트 명: ImproveWriting-V2-Production
   ```

2. **기존 데이터 마이그레이션**
   ```bash
   # Firebase CLI로 데이터 내보내기/가져오기
   firebase firestore:export ./backup
   firebase firestore:import ./backup --project new-project-id
   ```

3. **코드 설정 업데이트**
   ```typescript
   // src/lib/firebase/config.ts
   export const firebaseConfig = {
       apiKey: "새-API-키",
       authDomain: "새-프로젝트.firebaseapp.com",
       projectId: "새-프로젝트-ID",
       // ... 나머지 설정
   };
   ```

### Step 4: OAuth 클라이언트 설정

연결이 확인되면 Google Cloud Console에서:

1. **APIs & Services** → **Credentials**
2. **CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: Web application
4. **Authorized JavaScript origins** 추가:
   ```
   https://improvewriteapp.web.app
   https://improvewriteapp.firebaseapp.com
   http://localhost:5173
   ```
5. **Authorized redirect URIs** 추가:
   ```
   https://improvewriteapp.web.app/__/auth/handler
   https://improvewriteapp.firebaseapp.com/__/auth/handler
   ```

## 📋 확인 체크리스트

### 연결 확인
- [ ] Firebase Project ID와 Google Cloud Project ID가 일치
- [ ] Firebase Project Number와 Google Cloud Project Number가 일치
- [ ] Google Cloud Console에서 올바른 프로젝트가 선택됨

### OAuth 설정 확인
- [ ] Google Cloud Console → APIs & Services → Credentials에 OAuth 클라이언트 존재
- [ ] Authorized JavaScript origins에 배포 도메인 포함
- [ ] Authorized redirect URIs에 Firebase auth handler 포함

### 배포 설정 확인
- [ ] Firebase Hosting 설정 완료
- [ ] 올바른 프로젝트에 배포됨
- [ ] 도메인 연결 확인

## 🚨 주의사항

1. **프로젝트 변경 시**: 기존 사용자 데이터가 손실될 수 있음
2. **API 키 보안**: config.ts 파일이 .gitignore에 포함되어야 함
3. **설정 전파**: 변경 후 5-10분 대기 필요
4. **테스트**: 변경 후 다양한 브라우저에서 테스트

## 💡 권장사항

현재 상황에서는 **새 Firebase 프로젝트 생성**이 가장 안전하고 확실한 해결책입니다:

1. 설정 충돌 방지
2. 깔끔한 프로젝트 구조
3. 향후 관리 용이성
4. 디버깅 복잡성 감소