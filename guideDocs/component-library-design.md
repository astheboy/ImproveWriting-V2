# 🧩 공통 컴포넌트 라이브러리 설계

## 개요
재사용 가능한 UI 컴포넌트들을 체계적으로 설계하여 일관성 있는 인터페이스를 구축합니다.

---

## 📁 컴포넌트 구조

### **디렉토리 구조**
```
src/lib/components/ui/
├── Button/
│   ├── Button.svelte           # 기본 버튼 컴포넌트
│   ├── IconButton.svelte       # 아이콘 버튼
│   └── index.ts                # 내보내기
├── Card/
│   ├── Card.svelte             # 기본 카드
│   ├── StatCard.svelte         # 통계 카드
│   └── index.ts
├── Modal/
│   ├── Modal.svelte            # 모달 다이얼로그
│   └── index.ts
├── Layout/
│   ├── AppHeader.svelte        # 앱 헤더
│   ├── AppFooter.svelte        # 앱 푸터
│   ├── TeacherLayout.svelte    # 교사 레이아웃
│   ├── StudentLayout.svelte    # 학생 레이아웃
│   └── index.ts
├── Form/
│   ├── Input.svelte            # 입력 필드
│   ├── TextArea.svelte         # 텍스트 영역
│   ├── Select.svelte           # 선택 박스
│   └── index.ts
├── Navigation/
│   ├── TabNavigation.svelte    # 탭 내비게이션
│   ├── BottomNavigation.svelte # 하단 내비게이션
│   └── index.ts
├── Feedback/
│   ├── LoadingSpinner.svelte   # 로딩 스피너
│   ├── ErrorMessage.svelte     # 에러 메시지
│   ├── SuccessMessage.svelte   # 성공 메시지
│   └── index.ts
└── index.ts                    # 전체 컴포넌트 내보내기
```

---

## 🎯 핵심 컴포넌트 명세

### **Button 컴포넌트**

#### **Props 인터페이스**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;           // 링크로 사용할 경우
  target?: string;         // 링크 타겟
}
```

#### **사용 예시**
```svelte
<Button variant="primary" size="lg" on:click={handleClick}>
  저장하기
</Button>

<Button variant="outline" loading={isLoading}>
  <svelte:fragment slot="icon">
    <Icon name="save" />
  </svelte:fragment>
  저장 중...
</Button>
```

### **IconButton 컴포넌트**

#### **Props 인터페이스**
```typescript
interface IconButtonProps {
  icon: string;            // Material Icons 이름
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  disabled?: boolean;
  ariaLabel: string;       // 접근성 필수
}
```

### **Card 컴포넌트**

#### **Props 인터페이스**
```typescript
interface CardProps {
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  hover?: boolean;         // 호버 효과 여부
  clickable?: boolean;     // 클릭 가능한지
}
```

#### **슬롯 구조**
```svelte
<Card>
  <svelte:fragment slot="header">
    카드 헤더 내용
  </svelte:fragment>
  
  <svelte:fragment slot="content">
    카드 본문 내용
  </svelte:fragment>
  
  <svelte:fragment slot="actions">
    카드 액션 버튼들
  </svelte:fragment>
</Card>
```

### **StatCard 컴포넌트**

#### **Props 인터페이스**
```typescript
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  trend?: {
    value: number;
    type: 'increase' | 'decrease';
  };
}
```

### **Modal 컴포넌트**

#### **Props 인터페이스**
```typescript
interface ModalProps {
  open: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;      // X 버튼 표시 여부
  closeOnOverlay?: boolean; // 오버레이 클릭시 닫기
  closeOnEscape?: boolean; // ESC 키로 닫기
}
```

#### **이벤트**
```typescript
// 발생하는 이벤트들
'close': CustomEvent<void>;
'open': CustomEvent<void>;
```

---

## 📱 Layout 컴포넌트

### **TeacherLayout 컴포넌트**

#### **Props 인터페이스**
```typescript
interface TeacherLayoutProps {
  title: string;
  showBackButton?: boolean;
  user?: User;
}
```

#### **슬롯 구조**
```svelte
<TeacherLayout title="클래스 관리" {user}>
  <svelte:fragment slot="header-actions">
    <!-- 헤더 우측 액션 버튼들 -->
  </svelte:fragment>
  
  <svelte:fragment slot="content">
    <!-- 메인 콘텐츠 -->
  </svelte:fragment>
</TeacherLayout>
```

### **StudentLayout 컴포넌트**

#### **Props 인터페이스**
```typescript
interface StudentLayoutProps {
  title: string;
  showProfile?: boolean;
  bottomNavigation?: boolean;
}
```

---

## 📝 Form 컴포넌트

### **Input 컴포넌트**

#### **Props 인터페이스**
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxlength?: number;
  minlength?: number;
  readonly?: boolean;
}
```

### **Select 컴포넌트**

#### **Props 인터페이스**
```typescript
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
}
```

---

## 🧭 Navigation 컴포넌트

### **TabNavigation 컴포넌트**

#### **Props 인터페이스**
```typescript
interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: number;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  variant?: 'underline' | 'pills' | 'enclosed';
}
```

### **BottomNavigation 컴포넌트**

#### **Props 인터페이스**
```typescript
interface NavItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  badge?: number;
}

interface BottomNavigationProps {
  items: NavItem[];
  activeItem: string;
}
```

---

## 🎨 Design Tokens 활용

### **색상 시스템**
```svelte
<script>
  import { getColorClass } from '$lib/utils/design-tokens';
  
  export let color = 'primary';
  
  $: colorClass = getColorClass(color);
</script>

<button class={`btn ${colorClass}`}>
  <slot />
</button>
```

### **크기 시스템**
```typescript
// utils/design-tokens.ts
export const sizes = {
  sm: {
    padding: 'px-2 py-1',
    text: 'text-sm',
    height: 'h-8',
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-base',
    height: 'h-10',
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-lg',
    height: 'h-12',
  },
};
```

---

## 🔒 TypeScript 지원

### **공통 타입 정의**
```typescript
// types/components.ts

export interface BaseProps {
  class?: string;
  id?: string;
  'data-testid'?: string;
}

export interface InteractiveProps extends BaseProps {
  disabled?: boolean;
  loading?: boolean;
}

export interface FormFieldProps extends BaseProps {
  name?: string;
  required?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
}

// 이벤트 타입
export type ButtonClickEvent = CustomEvent<MouseEvent>;
export type InputChangeEvent = CustomEvent<{ value: string }>;
export type SelectChangeEvent = CustomEvent<{ value: string | number }>;
```

---

## ♿ 접근성 (Accessibility)

### **키보드 내비게이션**
```svelte
<!-- Button 컴포넌트 예시 -->
<script>
  function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<button 
  on:click={handleClick}
  on:keydown={handleKeydown}
  aria-label={ariaLabel}
  aria-disabled={disabled}
>
  <slot />
</button>
```

### **ARIA 속성**
```svelte
<!-- Modal 컴포넌트 예시 -->
<div 
  role="dialog" 
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">{title}</h2>
  <div id="modal-description">
    <slot name="content" />
  </div>
</div>
```

---

## 🧪 테스팅 지원

### **테스트 친화적 설계**
```svelte
<!-- 테스트를 위한 data-testid 자동 생성 -->
<script>
  export let testId;
  
  $: autoTestId = testId || `${componentName}-${Math.random().toString(36).substr(2, 9)}`;
</script>

<button data-testid={autoTestId}>
  <slot />
</button>
```

---

## 📦 번들링 최적화

### **Tree Shaking 지원**
```typescript
// src/lib/components/ui/index.ts
export { default as Button } from './Button/Button.svelte';
export { default as IconButton } from './Button/IconButton.svelte';
export { default as Card } from './Card/Card.svelte';
export { default as StatCard } from './Card/StatCard.svelte';
export { default as Modal } from './Modal/Modal.svelte';

// 사용시
import { Button, Card } from '$lib/components/ui';
```

---

## 📚 문서화 및 Storybook

### **컴포넌트 문서 템플릿**
```svelte
<!--
@component
버튼 컴포넌트

@example
```svelte
<Button variant="primary" on:click={handleClick}>
  클릭하세요
</Button>
```

@props
- variant: 'primary' | 'secondary' | 'outline' | 'ghost' - 버튼 스타일
- size: 'sm' | 'md' | 'lg' | 'xl' - 버튼 크기
- disabled: boolean - 비활성화 여부
- loading: boolean - 로딩 상태

@events
- click: 버튼 클릭 이벤트

@slots
- default: 버튼 텍스트 내용
- icon: 아이콘 슬롯
-->
```

이 설계를 바탕으로 일관성 있고 재사용 가능한 컴포넌트 라이브러리를 구축할 수 있습니다.