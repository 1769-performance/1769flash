# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the "1769Flash Dashboard" - a role-aware Next.js application for automotive dealers and customers. The app provides different navigation and functionality based on user profile types (dealer vs customer).

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run lint` - Run Next.js linting
- `npm start` - Start production server

## Architecture

### Tech Stack
- **Framework**: Next.js 15.2.4 with App Router
- **Styling**: Tailwind CSS v4.1.9 with shadcn/ui components
- **State Management**: React Context (AuthProvider)
- **API Client**: Custom fetch wrapper in `lib/api.ts`
- **Authentication**: Session-based with automatic redirect on 401

### Project Structure
```
app/                    # Next.js App Router pages
├── layout.tsx         # Root layout with AuthProvider
├── page.tsx          # Home page (redirects based on auth)
├── login/            # Authentication pages
├── projects/         # Project management
├── vehicles/         # Vehicle management
├── profile/          # User profile
├── payments/         # Payment management
├── licenses/         # License management
└── customers/        # Dealer-only customer management

components/
├── ui/               # shadcn/ui components
├── app-sidebar.tsx   # Role-aware navigation sidebar
├── protected-layout.tsx # Auth wrapper component
└── [feature-components] # Feature-specific components

hooks/
├── use-auth.tsx      # Authentication context and hook
├── use-paginated-list.tsx # API pagination helper
└── [other-hooks]

lib/
├── api.ts           # API client with typed helpers
└── utils.ts         # Utility functions
```

### Key Architecture Patterns

#### Role-Based Access Control
The application uses a profile_type system with two roles:
- **dealer**: Access to customers, projects, payments, licenses
- **customer**: Access to projects, vehicles, payments, licenses

Navigation is dynamically rendered in `app-sidebar.tsx` based on user role.

#### Authentication Flow
1. `AuthProvider` wraps the app and provides user context
2. `ProtectedLayout` component handles auth checking and redirects
3. API client (`lib/api.ts`) automatically redirects to `/login` on 401 responses

#### API Integration
- Base API client in `lib/api.ts` with credential-based auth
- Typed API responses for User, Project, Vehicle, ECU, File, Log
- Helper functions: `getJson()`, `postJson()`, `putJson()`, `postFormData()`
- Paginated responses supported with `PaginatedResponse<T>` type

#### Component Architecture
- Uses shadcn/ui component library extensively
- Custom components built on top of Radix UI primitives
- Tailwind CSS for styling with design system consistency

### Environment Variables
- `NEXT_PUBLIC_API_BASE_URL` - Backend API base URL

### Key Files to Understand
- `hooks/use-auth.tsx` - Central authentication logic
- `lib/api.ts` - API client and type definitions
- `components/app-sidebar.tsx` - Role-based navigation
- `components/protected-layout.tsx` - Authentication wrapper