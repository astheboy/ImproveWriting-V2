# Firebase 도메인 인증 오류 해결 가이드

## 🚨 현재 발생하는 오류
```
FirebaseError: Firebase: Error (auth/unauthorized-domain)
```

이 오류는 Firebase 프로젝트에서 `improvewriteapp.web.app` 도메인이 인증 허용 도메인으로 등록되지 않았기 때문입니다.

## 🔧 해결 방법

### 1. Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 현재 프로젝트(`ImproveWriting-V2`) 선택

### 2. Authentication 설정 변경
1. 좌측 메뉴에서 **Authentication** 클릭
2. **Settings** 탭 클릭
3. **Authorized domains** 섹션 찾기

### 3. 허용 도메인 추가
현재 허용 도메인 목록에 다음 도메인들이 포함되어야 합니다:

```
localhost
improvewriteapp.web.app
improvewriteapp.firebaseapp.com (기본으로 포함되어야 함)
```

**추가 방법:**
1. **Add domain** 버튼 클릭
2. `improvewriteapp.web.app` 입력
3. **Add** 버튼 클릭

### 4. 설정 저장 및 확인
- 변경사항은 자동으로 저장됩니다
- 몇 분 후 웹사이트에서 다시 로그인을 시도해보세요

## 📱 추가 확인사항

### Google OAuth 클라이언트 설정 확인
Google Cloud Console에서도 OAuth 클라이언트 설정을 확인해야 할 수 있습니다:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 해당 프로젝트 선택
3. **APIs & Services** > **Credentials** 이동
4. OAuth 2.0 클라이언트 ID 항목에서 웹 애플리케이션 설정 확인
5. **Authorized JavaScript origins**에 다음 URL들이 포함되어야 합니다:
   - `https://improvewriteapp.web.app`
   - `http://localhost:5173` (개발용)

### 일반적인 허용 도메인 목록 예시
```
localhost
127.0.0.1
improvewriteapp.web.app
improvewriteapp.firebaseapp.com
```

## 🚀 배포 후 확인사항

배포가 완료된 후 다음을 확인하세요:

1. **HTTPS 프로토콜 사용**: `https://improvewriteapp.web.app`
2. **브라우저 캐시 지우기**: 이전 오류가 캐시될 수 있음
3. **개발자 도구 콘솔 확인**: 추가 오류 메시지가 있는지 확인

## ⚠️ 주의사항

- 도메인 설정 변경 후 몇 분간 기다려야 할 수 있습니다
- 설정이 전파되는 데 시간이 소요될 수 있습니다
- 변경 후에도 문제가 지속되면 브라우저의 캐시와 쿠키를 지워보세요

## 🔍 문제 지속 시 추가 체크리스트

1. **Firebase 프로젝트 ID 확인**: `firebase.json`과 Firebase Console의 프로젝트 ID가 일치하는지 확인
2. **API 키 확인**: `src/lib/firebase/config.ts`의 설정이 올바른지 확인
3. **네트워크 연결**: 방화벽이나 네트워크 설정 문제는 없는지 확인
4. **브라우저 호환성**: 다른 브라우저에서도 같은 문제가 발생하는지 확인