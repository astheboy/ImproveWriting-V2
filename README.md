# ✨ 상상력을 펼치는 글쓰기 V2

> 실시간 협업 글쓰기를 통한 창의적 교육 플랫폼 - Svelte 기반 SPA 버전

## 🎯 프로젝트 개요

**상상력을 펼치는 글쓰기 V2**는 기존 MPA 기반 앱을 현대적인 **Svelte + SvelteKit SPA**로 완전히 재구축한 교육용 플랫폼입니다. 

교사와 학생이 함께 참여하는 실시간 창작 활동을 통해 창의성과 표현력을 기르며, AI 기반 피드백과 개인화 학습 포트폴리오를 제공합니다.

## 🚀 주요 특징

### ✨ **현재 구현된 기능 (Phase 1.1)**
- 🔐 **통합 로그인 시스템**: 교사 Google OAuth + 학생 익명 참여
- 📚 **교사 대시보드**: 실시간 클래스 생성/관리, 참여 코드 자동 생성
- 🔄 **실시간 데이터 동기화**: Firebase Firestore 기반 즉시 업데이트
- 📱 **완전 반응형**: 모바일부터 데스크톱까지 최적화된 UI/UX
- ⚡ **SPA 경험**: 페이지 로딩 없는 끊김 없는 사용자 경험

### 🔮 **계획된 고급 기능 (Phase 2-4)**
- 🌟 **낱말 탐험 시스템**: 어휘 확장 게임 + 사전 연동
- 🤖 **AI 튜터**: Gemini 기반 개인화 피드백 및 창작 영감
- 🏆 **게임화**: 포인트/레벨/배지 시스템
- 📊 **학습 분석**: BigQuery 기반 성장 추적 대시보드
- 💼 **개인 포트폴리오**: 학생별 창작물 관리 및 공유

## 🛠️ 기술 스택

### **Frontend**
- ⚡ **Svelte 4** + **SvelteKit 2** - 고성능 반응형 컴포넌트
- 📘 **TypeScript** - 타입 안전성 및 개발 생산성
- 🎨 **Tailwind CSS** - 유틸리티 우선 스타일링
- ⚙️ **Vite 5** - 번개 같은 빌드 도구

### **Backend & Cloud**
- 🔥 **Firebase Firestore** - 실시간 NoSQL 데이터베이스
- 🔐 **Firebase Auth** - Google OAuth + 익명 인증
- ⚡ **Cloud Functions** - 서버리스 백엔드 로직
- 🤖 **Google Gemini AI** - 창작 지원 및 피드백
- ☁️ **Firebase Hosting** - 글로벌 CDN 배포

## 📁 프로젝트 구조

```
src/
├── lib/
│   ├── components/        # Svelte 컴포넌트
│   │   ├── Login.svelte
│   │   └── Dashboard.svelte
│   └── firebase/          # Firebase 설정
│       ├── firebase.ts
│       └── config.template.ts
├── routes/                # SvelteKit 라우팅
│   ├── +layout.svelte
│   ├── +page.svelte       # 메인 로그인
│   └── dashboard/
└── app.html
```

## 🚀 시작하기

### 1. **저장소 클론**
```bash
git clone https://github.com/astheboy/ImproveWriting-V2.git
cd ImproveWriting-V2
```

### 2. **의존성 설치**
```bash
npm install
```

### 3. **Firebase 설정**
```bash
# Firebase 설정 파일 복사
cp src/lib/firebase/config.template.ts src/lib/firebase/config.ts
# config.ts에 실제 Firebase 설정값 입력
```

### 4. **개발 서버 실행**
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 📈 개발 로드맵

| Phase | 기간 | 상태 | 주요 기능 |
|-------|------|------|-----------|
| **Phase 1.1** | ✅ 완료 | 🎉 | SPA 인프라, 로그인, 대시보드 |
| **Phase 1.2** | 🔄 진행중 | ⚡ | 클래스/학생 화면, CRUD |
| **Phase 2** | 📅 예정 | 📋 | 포트폴리오, QR 코드, 멀티미디어 |
| **Phase 3** | 📅 예정 | 🔮 | 낱말 탐험, AI 고도화 |
| **Phase 4** | 📅 예정 | 📊 | 분석 도구, 고급 기능 |

## 🎯 주요 혁신사항

### **기존 버전 vs V2**
| 구분 | 기존 (V1) | **새 버전 (V2)** |
|------|-----------|------------------|
| **아키텍처** | 전통적 MPA | ⚡ 현대적 SPA |
| **프레임워크** | Vanilla JS | 🔥 Svelte + TypeScript |
| **사용자 경험** | 페이지 새로고침 | 🚀 끊김 없는 네비게이션 |
| **개발 생산성** | HTML 직접 조작 | 🧩 컴포넌트 기반 개발 |
| **확장성** | 단일 구조 | 📈 모듈화된 아키텍처 |

## 🌟 교육적 가치

### **학생에게**
- 🎨 **창의적 표현**: 이미지 기반 자유로운 글쓰기
- 🤝 **협력 학습**: 실시간 공유 및 상호 피드백
- 🏆 **성취감**: 게임화 요소를 통한 학습 동기 부여
- 📚 **어휘력 확장**: 낱말 탐험을 통한 언어 능력 향상

### **교사에게**
- 📊 **실시간 모니터링**: 학생 활동 현황 즉시 확인
- 🎯 **개인화 지도**: AI 분석 기반 맞춤형 교육
- ⏰ **수업 효율성**: 자동화된 관리 도구
- 📈 **성장 추적**: 데이터 기반 학습 분석

## 🤝 기여하기

프로젝트 개선에 관심이 있으시다면:

1. 🍴 Fork the repository
2. 🌟 Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. 💻 Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the branch (`git push origin feature/AmazingFeature`)
5. 🎉 Open a Pull Request

## 📞 문의

- **개발자**: [astheboy](https://github.com/astheboy)
- **프로젝트 링크**: [https://github.com/astheboy/ImproveWriting-V2](https://github.com/astheboy/ImproveWriting-V2)

---

### 🎉 **"상상력을 펼치는 글쓰기 V2 - 차세대 교육 플랫폼으로의 여정이 시작됩니다!"**

[![Made with Svelte](https://img.shields.io/badge/Made%20with-Svelte-FF3E00?style=for-the-badge&logo=svelte)](https://svelte.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)