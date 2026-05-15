# Onlok System Documentation

This document provides a comprehensive overview of the Onlok platform architecture, features, and technology stack built so far across the frontend and backend.

---

## 1. System Overview
Onlok is an identity and business verification platform. It allows users (vendors/businesses) to register, submit documents and biometric data for verification, and receive an "Onlok ID" and verification badge. Administrators can review these submissions and approve or reject them.

The system is split into two main repositories/folders:
- **Backend**: Node.js & Express REST API with an SQLite database.
- **Frontend**: React + Vite SPA using TypeScript and Material UI.

---

## 2. Backend Architecture

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JSON Web Tokens (JWT)
- **File Uploads**: Multer (Local disk storage in `uploads/` directory)
- **Password Hashing**: bcryptjs

### Core Entities (Database Schema)
1. **Users Table**: Stores authentication credentials, roles (`user`, `admin`), `vendor_id` (the unique Onlok ID, e.g., `OL-NG-3330`), and basic profile information.
2. **Profiles Table**: Stores business details (name, category, description), verification status (`pending`, `verified`, `rejected`), social links, and file paths to uploaded verification documents (national ID, business registration, video recordings).

### Main API Routes
- **Auth Routes (`/api/auth`)**:
  - `POST /register`: Registers a new user.
  - `POST /login`: Authenticates a user and returns a JWT.
  - `GET /me`: Returns the currently logged-in user data based on JWT.
- **User/Profile Routes (`/api/users`)**:
  - `GET /dashboard`: Fetches the current user's profile and business details.
  - `PUT /profile`: Updates user bio, social links, and contact info.
  - `POST /upload-docs`: Handles multipart form data for uploading IDs and certificates.
- **Admin Routes (`/api/admin`)**:
  - Protected by `adminAuthMiddleware`.
  - `GET /verifications`: Lists all users currently pending verification.
  - `GET /verifications/:id`: Fetches detailed documents and data for a specific pending user.
  - `POST /verifications/:id/approve`: Approves a user, upgrading their status to `verified`.
  - `POST /verifications/:id/reject`: Rejects a user's verification attempt.
- **Search Routes (`/api/search`)**:
  - `GET /`: Allows querying verified users by name, business name, category, or Onlok ID.

---

## 3. Frontend Architecture

### Tech Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling & UI**: Material UI (MUI v5)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios (configured with interceptors to automatically attach JWTs)
- **State Management**: React Context (`AuthContext`)
- **Toasts**: `react-hot-toast`

### Application Structure & Routing
The frontend utilizes nested routing to maintain clean layouts.
- **Public Routes**:
  - `/`: Landing Page
  - `/login`: User & Admin Authentication
  - `/register`: Multi-step registration flow (Personal Info -> Identity Verification -> Business Details)
  - `/search`: Public search directory to find verified vendors.
- **Protected User Routes (`/dashboard/*`)**: Wrapped by `DashboardLayout` (Sidebar + Top Nav)
  - `/dashboard`: Main profile overview, QR Code generation (`react-qr-code`), and status cards.
  - `/dashboard/verification`: Detailed timeline and status of submitted documents.
  - `/dashboard/badge`: (Placeholder) Showcase for the vendor's verification badge.
- **Protected Admin Routes (`/admin/*`)**: Wrapped by `AdminLayout`
  - `/admin/verifications`: The queue of pending vendor verifications.
  - `/admin/verifications/:id`: Detailed review screen allowing the admin to inspect uploaded documents and click "Approve" or "Reject".

### Key Features Implemented
1. **Multi-Step Registration Flow**: A highly customized, animated stepper in `RegisterPage.tsx` that seamlessly guides users through complex data entry and file uploads.
2. **Dashboard UI Refactor**: A fully responsive, flexbox-based dashboard that flawlessly matches the Onlok high-fidelity designs, complete with dynamic QR code generation.
3. **Authentication Context**: `AuthContext.tsx` maintains global session state, intercepts 401 Unauthorized errors, and automatically manages the user's logged-in status.
4. **Admin Panel**: A dedicated portal strictly for users with the `admin` role to review and moderate the platform.
5. **Dynamic Theming**: Centralized MUI theme (`theme.ts`) utilizing custom fonts (Inter), custom primary colors (`#1A1FE8`), and border radiuses to match the brand identity.

---

## 4. Next Steps & Future Enhancements
- **Production Database**: Migrate from SQLite to PostgreSQL or MySQL for production scalability.
- **Cloud Storage**: Transition Multer uploads from the local filesystem to AWS S3 or a similar cloud blob storage provider.
- **Email Notifications**: Integrate a service like SendGrid or AWS SES to notify users when their verification status changes (approved/rejected).
- **Payment Integration**: Implement Stripe or Paystack on the `/checkout` route for subscription billing.
