# Google OAuth 클라이언트 설정 가이드

## 🚨 현재 상황
Firebase Console에서 승인된 도메인에 `improvewriteapp.web.app`가 등록되어 있지만 여전히 인증 오류가 발생하고 있습니다.

## 🔍 가능한 원인들

### 1. Google Cloud Console OAuth 클라이언트 설정 누락
Firebase와 별도로 Google Cloud Console에서도 OAuth 클라이언트를 설정해야 합니다.

### 2. Firebase 프로젝트와 Google Cloud 프로젝트 불일치
Firebase 프로젝트와 Google Cloud 프로젝트가 연결되지 않았을 수 있습니다.

## 🔧 해결 방법

### Step 1: Google Cloud Console 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 이동
   - 상단에서 올바른 프로젝트가 선택되어 있는지 확인
   - Firebase 프로젝트와 동일한 프로젝트여야 함

2. **APIs & Services 설정**
   ```
   좌측 메뉴 → APIs & Services → Credentials
   ```

3. **OAuth 2.0 클라이언트 ID 확인**
   - `OAuth 2.0 Client IDs` 섹션에서 웹 애플리케이션 항목 확인
   - 없다면 새로 생성해야 함

### Step 2: OAuth 클라이언트 생성/수정

#### 새 OAuth 클라이언트 생성 (없는 경우)
1. **CREATE CREDENTIALS** 클릭
2. **OAuth client ID** 선택
3. **Application type**: Web application
4. **Name**: `ImproveWriting-V2 Web Client`
5. **Authorized JavaScript origins** 추가:
   ```
   https://improvewriteapp.web.app
   https://improvewriteapp.firebaseapp.com
   http://localhost:5173
   http://127.0.0.1:5173
   ```
6. **Authorized redirect URIs** 추가:
   ```
   https://improvewriteapp.web.app/__/auth/handler
   https://improvewriteapp.firebaseapp.com/__/auth/handler
   ```

#### 기존 OAuth 클라이언트 수정 (있는 경우)
1. 기존 OAuth 클라이언트 ID 클릭
2. **Authorized JavaScript origins**에 다음 추가:
   ```
   https://improvewriteapp.web.app
   ```
3. **Save** 클릭

### Step 3: Firebase 설정 연결 확인

1. **Firebase Console** → **Project Settings** → **General** 탭
2. **Your apps** 섹션에서 웹 앱 확인
3. **Web API Key**가 Google Cloud Console의 API 키와 일치하는지 확인

### Step 4: 설정 전파 대기
- Google OAuth 설정 변경 후 **5-10분** 대기
- 브라우저 캐시 및 쿠키 완전 삭제
- 시크릿/프라이빗 모드에서 테스트

## 📋 체크리스트

### Firebase Console 확인사항
- [ ] Authentication → Settings → Authorized domains에 `improvewriteapp.web.app` 포함
- [ ] Project Settings → General → Web API Key 확인

### Google Cloud Console 확인사항
- [ ] APIs & Services → Credentials에 OAuth 2.0 클라이언트 ID 존재
- [ ] Authorized JavaScript origins에 `https://improvewriteapp.web.app` 포함
- [ ] Authorized redirect URIs에 `https://improvewriteapp.web.app/__/auth/handler` 포함

### 브라우저 확인사항
- [ ] 브라우저 캐시 및 쿠키 완전 삭제
- [ ] HTTPS 프로토콜 사용 (`https://` 확인)
- [ ] 개발자 도구에서 네트워크 탭 확인
- [ ] 다른 브라우저에서도 테스트

## 🔍 추가 디버깅 방법

### 개발자 도구에서 확인할 사항
1. **Console 탭**: 추가 오류 메시지 확인
2. **Network 탭**: 실패한 요청 확인
3. **Application 탭**: LocalStorage/SessionStorage 확인

### 네트워크 요청 분석
인증 시도 시 다음 URL로의 요청이 실패하는지 확인:
```
https://accounts.google.com/oauth/v2/auth
https://securetoken.googleapis.com/v1/token
```

## ⚠️ 주의사항

1. **도메인 정확성**: `improvewriteapp.web.app` (점 위치 주의)
2. **프로토콜**: 반드시 `https://` 사용
3. **대기 시간**: 설정 변경 후 충분한 시간 대기
4. **브라우저 캐시**: 완전한 캐시 삭제 필요

## 🆘 여전히 문제가 지속되는 경우

다음 정보를 함께 확인해주세요:
1. Firebase 프로젝트 ID
2. Google Cloud 프로젝트 ID  
3. 정확한 에러 메시지 전체 텍스트
4. 브라우저 개발자 도구의 Network 탭 스크린샷