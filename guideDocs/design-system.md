# 🎨 통합 디자인 시스템

## 개요
AI로 생성된 Frontend UI와 현재 Svelte 프로젝트를 통합하기 위한 표준 디자인 시스템입니다.

---

## 🎯 핵심 디자인 토큰

### **컬러 팔레트**

#### **Primary Colors**
```css
:root {
  /* 메인 브랜드 컬러 */
  --color-primary: #13a4ec;
  --color-primary-hover: #0f8ccc;
  --color-primary-light: rgba(19, 164, 236, 0.1);
  --color-primary-20: rgba(19, 164, 236, 0.2);
}
```

#### **Background Colors**
```css
:root {
  /* 라이트 모드 */
  --color-background-light: #f6f7f8;
  --color-background-subtle-light: #e7eff3;
  
  /* 다크 모드 */
  --color-background-dark: #101c22;
  --color-background-subtle-dark: #1a2a33;
}
```

#### **Text Colors**
```css
:root {
  /* 라이트 모드 텍스트 */
  --color-text-heading-light: #0d171b;
  --color-text-body-light: #4c809a;
  
  /* 다크 모드 텍스트 */
  --color-text-heading-dark: #f6f7f8;
  --color-text-body-dark: #a7bbc7;
}
```

#### **Border Colors**
```css
:root {
  /* 라이트 모드 보더 */
  --color-border-subtle-light: #cfdfe7;
  
  /* 다크 모드 보더 */
  --color-border-subtle-dark: #24353f;
}
```

### **Typography**

#### **Font Family**
```css
:root {
  --font-display: 'Noto Sans KR', sans-serif;
}

/* Material Icons */
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');
```

#### **Font Weights**
- `font-normal`: 400
- `font-medium`: 500  
- `font-bold`: 700
- `font-black`: 900

#### **Font Sizes**
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)  
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)

### **Spacing & Layout**

#### **Border Radius**
```css
:root {
  --radius-default: 0.25rem; /* 4px */
  --radius-md: 0.5rem;       /* 8px */
  --radius-lg: 0.75rem;      /* 12px */
  --radius-xl: 1rem;         /* 16px */
  --radius-2xl: 1.5rem;      /* 24px */
  --radius-full: 9999px;     /* 원형 */
}
```

#### **Shadow**
```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

---

## 🧩 컴포넌트 패턴

### **Card Component**
```html
<!-- 기본 카드 구조 -->
<div class="bg-white dark:bg-subtle p-4 rounded-xl shadow-sm border border-subtle">
  <!-- 카드 내용 -->
</div>
```

### **Button Variants**

#### **Primary Button**
```html
<button class="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-transform hover:scale-105">
  Primary Action
</button>
```

#### **Secondary Button**
```html
<button class="bg-subtle hover:bg-primary/5 text-heading-primary border border-subtle rounded-xl py-3 px-6 transition-colors">
  Secondary Action
</button>
```

#### **Icon Button**
```html
<button class="flex h-10 w-10 items-center justify-center rounded-full text-heading-primary hover:bg-primary/10 transition-colors">
  <span class="material-symbols-outlined">icon_name</span>
</button>
```

### **Layout Patterns**

#### **Header**
```html
<header class="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark border-b border-subtle">
  <div class="flex items-center gap-2">
    <span class="material-symbols-outlined text-primary text-3xl">icon</span>
    <h1 class="text-xl font-bold text-heading-primary">Title</h1>
  </div>
  <button class="icon-button">
    <span class="material-symbols-outlined">person</span>
  </button>
</header>
```

#### **Stats Card**
```html
<div class="bg-subtle p-4 rounded-xl flex flex-col items-center justify-center text-center border border-subtle">
  <p class="text-3xl font-black text-primary">28</p>
  <p class="text-sm text-body">활성 학생</p>
</div>
```

#### **Navigation Footer**
```html
<footer class="sticky bottom-0 bg-background-light/80 backdrop-blur-sm border-t border-primary/20">
  <nav class="flex justify-around p-2">
    <a class="flex flex-col items-center justify-center w-full text-gray-500 hover:text-primary transition-colors">
      <span class="material-symbols-outlined">home</span>
      <span class="text-xs">Home</span>
    </a>
    <!-- 더 많은 내비게이션 아이템 -->
  </nav>
</footer>
```

---

## 📱 반응형 디자인

### **Breakpoints**
```css
/* Mobile First Approach */
/* sm: @media (min-width: 640px) */
/* md: @media (min-width: 768px) */
/* lg: @media (min-width: 1024px) */
/* xl: @media (min-width: 1280px) */
/* 2xl: @media (min-width: 1536px) */
```

### **Grid System**
```html
<!-- 반응형 그리드 예시 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- 그리드 아이템들 -->
</div>
```

---

## 🌙 다크모드 지원

### **다크모드 토글**
```css
/* 다크모드 클래스 기반 */
.dark .text-heading-primary { color: #f6f7f8; }
.dark .text-body { color: #a7bbc7; }
.dark .bg-subtle { background-color: #1a2a33; }
.dark .border-subtle { border-color: #24353f; }
```

### **다크모드 컴포넌트 예시**
```html
<div class="bg-white dark:bg-gray-800 p-4 rounded-lg">
  <h2 class="text-gray-900 dark:text-white">제목</h2>
  <p class="text-gray-500 dark:text-gray-400">본문</p>
</div>
```

---

## ⚡ 인터랙션 & 애니메이션

### **Hover Effects**
```css
/* 스케일 변화 */
.hover-scale { transition: transform 0.2s; }
.hover-scale:hover { transform: scale(1.05); }

/* 색상 변화 */
.transition-colors { transition: color 0.2s, background-color 0.2s; }

/* 그림자 변화 */
.hover-shadow { transition: box-shadow 0.2s; }
.hover-shadow:hover { box-shadow: var(--shadow-md); }
```

### **Loading States**
```html
<!-- 스피너 -->
<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>

<!-- 펄스 효과 -->
<div class="animate-pulse bg-gray-200 rounded h-4"></div>
```

---

## 🎯 접근성 (Accessibility)

### **Color Contrast**
- AA 등급 준수: 4.5:1 이상
- AAA 등급 권장: 7:1 이상

### **Focus States**
```css
/* 포커스 표시 */
.focus-visible:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### **ARIA 지원**
```html
<!-- 버튼 예시 -->
<button aria-label="메뉴 열기" aria-expanded="false">
  <span class="material-symbols-outlined">menu</span>
</button>

<!-- 입력 필드 예시 -->
<input aria-describedby="help-text" aria-required="true" />
<div id="help-text">도움말 텍스트</div>
```

---

## 🔧 Tailwind CSS 설정

### **커스텀 설정**
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#13a4ec',
        'background-light': '#f6f7f8',
        'background-dark': '#101c22',
      },
      fontFamily: {
        display: ['Noto Sans KR', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
```

이 디자인 시스템을 기반으로 일관성 있고 사용자 친화적인 인터페이스를 구축할 수 있습니다.