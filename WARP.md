# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**상상력을 펼치는 글쓰기 V2** is a Korean educational platform for creative writing built as a modern SPA using Svelte + SvelteKit. It's a complete rewrite from a legacy MPA version, focusing on real-time collaborative writing between teachers and students with AI-powered feedback.

## Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install

# Copy Firebase config template and configure
cp src/lib/firebase/config.template.ts src/lib/firebase/config.ts
# Edit config.ts with actual Firebase project settings
```

### Development
```bash
# Start development server (localhost:5173)
npm run dev

# Type checking
npm run check

# Watch mode type checking
npm run check:watch

# SvelteKit sync (prepare types and generated files)
npm run prepare
```

### Build and Deploy
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Firebase (requires firebase-tools)
firebase deploy
```

### Testing and Quality
```bash
# Svelte component type checking
svelte-check --tsconfig ./tsconfig.json

# Run check command (includes sync + type checking)
npm run check
```

## Architecture Overview

### Tech Stack
- **Frontend**: Svelte 4 + SvelteKit 2 with TypeScript
- **Styling**: Tailwind CSS (CDN-based)
- **Backend**: Firebase v10 (Firestore, Auth, Functions, Storage)
- **Build**: Vite 5 with SvelteKit adapter-static for SPA
- **Authentication**: Google OAuth (teachers) + Anonymous (students)

### Project Structure
```
src/
├── lib/
│   ├── components/           # Svelte components
│   │   ├── Login.svelte     # Main login/join interface  
│   │   ├── Dashboard.svelte # Teacher dashboard
│   │   ├── ClassManagement.svelte
│   │   └── StudentView.svelte
│   ├── firebase/            # Firebase configuration
│   │   ├── firebase.ts      # Firebase initialization
│   │   ├── config.ts        # Firebase config (gitignored)
│   │   └── config.template.ts
│   └── index.ts
└── routes/                  # SvelteKit file-based routing
    ├── +layout.svelte       # Global layout
    ├── +page.svelte         # Login page (/)
    └── dashboard/
        └── +page.svelte     # Teacher dashboard
```

### Firebase Architecture
- **Authentication**: 
  - Teachers: Google OAuth with user profile storage
  - Students: Anonymous authentication with class participation
- **Firestore Collections**:
  - `users`: Teacher profiles and metadata
  - `classrooms`: Class info with join codes and teacher ownership
  - Class-specific collections for student submissions and activities
- **Real-time Updates**: Uses Firestore `onSnapshot` for live data synchronization

### Key Technical Decisions
1. **SPA Configuration**: Uses `adapter-static` with fallback routing (`fallback: 'index.html'`) for client-side navigation
2. **Authentication Flow**: Dual-path auth system supporting both teacher and student workflows
3. **State Management**: Svelte stores for reactive state, Firebase subscriptions for real-time data
4. **Styling**: Tailwind CSS loaded via CDN for rapid development
5. **Korean Font**: Noto Sans KR for optimal Korean text rendering
6. **Build Configuration**: Vite-based build system with TypeScript support and static adapter
7. **Firebase v10 Modular SDK**: Uses tree-shakable imports for optimal bundle size

## Development Phase Status

Currently in **Phase 1.2** - expanding beyond basic login/dashboard:

### ✅ Completed (Phase 1.1)
- Modern Svelte + TypeScript project setup
- Firebase v10 integration with modular SDK
- Teacher Google OAuth login and dashboard
- Student anonymous participation via join codes
- Real-time class creation and management
- SPA routing with authentication guards

### 🔄 In Progress (Phase 1.2)  
- Class management interface (`/class/[id]`)
- Student participation view (`/student/[classId]`)
- Activity creation and management
- Real-time writing collaboration features

### 📅 Planned Features
- AI-powered feedback system using Google Gemini
- Vocabulary exploration games
- Student portfolio management
- QR code integration for easy class joining
- Analytics and progress tracking

## Important Configuration Notes

### Firebase Setup
- **REQUIRED**: Copy `config.template.ts` to `config.ts` before development
- Configure Firebase project settings in `config.ts` (never commit this file)
- Firebase emulators can be enabled in `firebase.ts` for local development (currently commented out)
- The project uses Firebase v10 modular SDK with tree-shaking support

### Authentication Requirements
- Google OAuth requires proper domain configuration in Firebase Console
- Anonymous auth must be enabled for student participation
- Teachers are identified by Firebase UID in Firestore user documents

### Deployment Configuration
- Uses Firebase Hosting with SPA rewrites configured in `firebase.json`
- Build output configured for `build/` directory (both pages and assets)
- Static adapter generates client-side routing compatible build
- Firebase hosting rewrites all routes to `/index.html` for SPA functionality

## Component Patterns

### Authentication State
- Components use `auth.onAuthStateChanged` for reactive user state
- Automatic redirection based on authentication status
- Loading states and error handling built into auth flows

### Real-time Data
- Use Firestore `onSnapshot` for live data updates
- Proper cleanup of listeners in component lifecycle
- Error boundaries for network failures

### User Experience
- Korean-first UI with proper font loading
- Mobile-responsive design with Tailwind utilities
- Loading states and progress indicators for async operations
- 6-digit alphanumeric class join codes for easy sharing

## Firebase Security Considerations
- Teachers can only access/modify their own classrooms
- Students can only join existing classes with valid codes
- Anonymous users are scoped to specific class participation
- Proper Firestore security rules should restrict data access by user role

## External Dependencies
- **Chart.js**: For future analytics dashboards and data visualization
- **QRCode libraries**: `qrcode` and `qrcode-reader` for mobile class joining functionality
- **Firebase v10**: Complete suite (Auth, Firestore, Functions, Storage, Analytics)
- **Tailwind CSS**: Loaded via CDN for rapid styling iterations

## Development Workflow Notes

### Firebase Configuration Management
- `config.template.ts` contains the template structure for Firebase configuration
- Copy to `config.ts` and populate with actual values before development
- `config.ts` is gitignored to protect sensitive Firebase project details
- Firebase emulators are configured but commented out in `firebase.ts`

### SvelteKit Specific Patterns
- File-based routing in `src/routes/`
- `+layout.svelte` provides global layout and shared logic
- `+page.svelte` files define individual routes
- Components in `src/lib/components/` are reusable across routes
- TypeScript support with `app.d.ts` for type definitions

### Firebase Integration Patterns
- Modular v10 SDK imports for optimal tree-shaking
- Real-time listeners using `onSnapshot` for live data updates
- Proper listener cleanup in component lifecycle
- Analytics conditionally loaded only in browser environment

This project represents a modern educational technology approach, emphasizing real-time collaboration, user experience, and scalable architecture for Korean language creative writing education.
