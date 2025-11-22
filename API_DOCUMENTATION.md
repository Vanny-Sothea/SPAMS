# KSMS Backend - Complete API Documentation

## Overview

This document provides comprehensive API documentation for the KSMS (Knowledge and Student Management System) backend services. All endpoints are accessed through the **API Gateway** which handles routing, authentication, rate limiting, and CORS.

---

## Table of Contents

1. [API Gateway Configuration](#1-api-gateway-configuration)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Identity Service API](#3-identity-service-api)
4. [Grade Service API](#4-grade-service-api)
5. [Error Handling](#5-error-handling)
6. [Rate Limiting](#6-rate-limiting)
7. [TypeScript Types](#7-typescript-types)

---

## 1. API Gateway Configuration

### Base URL

- **Development**: `http://localhost:3000`
- **Production**: Configure based on deployment

### CORS Settings

- **Allowed Origins**:
  - `http://localhost:3000`
  - `http://localhost:3003`
- **Credentials**: Enabled (cookies are sent with requests)
- **Allowed Headers**: `Content-Type`, `Authorization`
- **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`

### Service Routes

- `/v1/auth/*` → Identity Service
- `/v1/grade/*` → Grade Service
- `/v1/notification/*` → Notification Service

### Health Check

```http
GET /ping
```

**Response:**

```json
{
  "message": "PONG"
}
```

---

## 2. Authentication & Authorization

### Cookie-Based Authentication

The system uses HTTP-only cookies for authentication:

- **accessToken**: Short-lived token for API authentication
- **refreshToken**: Long-lived token for obtaining new access tokens
- **verificationToken**: Temporary token for account verification and password reset flows

### Authentication Flow

1. User logs in → Receives `accessToken` and `refreshToken` cookies
2. Include cookies in subsequent requests (automatically sent by browser)
3. When `accessToken` expires → Use `/v1/auth/refresh-token` endpoint
4. User logs out → Cookies are cleared

### Role-Based Access Control

- **USER**: Regular user access
- **ADMIN**: Administrative access
- **SUPERADMIN**: Super administrative access

### Protected Routes

Routes requiring authentication will return `401 Unauthorized` if not authenticated.

---

## 3. Identity Service API

Base Path: `/v1/auth`

### 3.1 Health Check

#### Ping

```http
GET /v1/auth/ping
```

**Response:** `200 OK`

```json
{
  "message": "PONG"
}
```

---

### 3.2 Check Authentication

#### Check Auth Status

```http
GET /v1/auth/check-auth
```

**Authentication:** Required (ADMIN or SUPERADMIN role)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Authenticated",
  "user": {
    "userId": "507f1f77bcf86cd799439011",
    "role": "ADMIN"
  }
}
```

**Error Response:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

### 3.3 User Registration

#### Register New User

```http
POST /v1/auth/register
```

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**

- `firstName`: Required, string
- `lastName`: Required, string
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters

**Success Response:** `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully"
}
```

**Note:**

- Sets `verificationToken` cookie
- Sends verification code email via notification service
- Verification code expires in 3 minutes
- If email matches `ADMIN_ACCOUNT` env variable, user gets ADMIN role

**Error Responses:**

`400 Bad Request` - Validation error

```json
{
  "success": false,
  "message": "Email already in use"
}
```

`500 Internal Server Error`

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

### 3.4 Account Verification

#### Verify Account with Code

```http
POST /v1/auth/verify-account
```

**Authentication:** Requires `verificationToken` cookie (set during registration)

**Request Body:**

```json
{
  "code": "123456"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Account verified successfully"
}
```

**Error Responses:**

`400 Bad Request` - Invalid or expired code

```json
{
  "success": false,
  "message": "Invalid or expired verification code"
}
```

`404 Not Found` - User not found

```json
{
  "success": false,
  "message": "User not found"
}
```

---

#### Resend Verification Code

```http
POST /v1/auth/verify-account/resend-code
```

**Authentication:** Requires `verificationToken` cookie

**Request Body:** None

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Resend verification code request successful"
}
```

**Note:** Generates new 6-digit code valid for 3 minutes

---

### 3.5 User Login

#### Login

```http
POST /v1/auth/login
```

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "User logged in successfully",
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

**Note:** Sets `accessToken` and `refreshToken` cookies

**Error Responses:**

`400 Bad Request` - Account not verified

```json
{
  "success": false,
  "message": "Account not verified"
}
```

`401 Unauthorized` - Invalid credentials

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

`404 Not Found` - User not found

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3.6 Token Management

#### Refresh Access Token

```http
POST /v1/auth/refresh-token
```

**Authentication:** Requires `refreshToken` cookie

**Request Body:** None

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "User refresh token successfully",
  "accessToken": "new-access-token-value",
  "refreshToken": "new-refresh-token-value"
}
```

**Note:**

- Old refresh token is invalidated
- New tokens are set as cookies
- Tokens are also returned in response body

**Error Responses:**

`400 Bad Request` - Invalid or expired token

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### 3.7 Logout

#### Logout User

```http
POST /v1/auth/logout
```

**Authentication:** Required (any authenticated user)

**Request Body:** None

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

**Note:**

- Clears all auth cookies
- Invalidates refresh tokens in database

---

### 3.8 Password Reset Flow

#### Step 1: Request Password Reset

```http
POST /v1/auth/forgot-password
```

**Request Body:**

```json
{
  "email": "john.doe@example.com"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Forgot password request successful"
}
```

**Note:**

- Sets `verificationToken` cookie
- Sends 6-digit code to email
- Code expires in 3 minutes

**Error Response:** `404 Not Found`

```json
{
  "success": false,
  "message": "User not found"
}
```

---

#### Step 2: Verify Reset Code

```http
POST /v1/auth/verify-reset-password
```

**Authentication:** Requires `verificationToken` cookie

**Request Body:**

```json
{
  "code": "123456"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Account verified successfully, ready to reset password"
}
```

**Note:**

- Clears `verificationToken` cookie
- Sets `resetPasswordToken` cookie for final step

**Error Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Invalid or expired verification code"
}
```

---

#### Step 2b: Resend Reset Code

```http
POST /v1/auth/verify-reset-password/resend-code
```

**Authentication:** Requires `verificationToken` cookie

**Request Body:** None

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Resend verification code request successful"
}
```

---

#### Step 3: Reset Password

```http
PUT /v1/auth/reset-password
```

**Authentication:** Requires `resetPasswordToken` cookie

**Request Body:**

```json
{
  "newPassword": "NewSecurePassword123!"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Note:**

- Clears `resetPasswordToken` cookie
- User must log in again with new password

---

## 4. Grade Service API

Base Path: `/v1/grade`

### 4.1 Health Check

#### Ping

```http
GET /v1/grade/ping
```

**Response:** `200 OK`

```json
{
  "message": "PONG"
}
```

---

### 4.2 CSV Upload

#### Upload Grades CSV

```http
POST /v1/grade/upload
Content-Type: multipart/form-data
```

**Request:**

- Form field name: `file`
- File type: CSV
- CSV Headers (in order):
  1. `studentId`
  2. `studentName`
  3. `batch`
  4. `major`
  5. `semester`
  6. `courseCode`
  7. `courseName`
  8. `score`

**Example CSV:**

```csv
STD2023001,John Doe,2023,Computer Science,Fall 2023,CS101,Introduction to CS,95
STD2023001,John Doe,2023,Computer Science,Fall 2023,MATH201,Calculus II,87
STD2023002,Jane Smith,2023,Mathematics,Fall 2023,MATH201,Calculus II,92
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "CSV processed"
}
```

**Note:**

- Upserts student grades (creates or updates existing records)
- Groups courses by studentId and semester
- Skips rows with missing required fields (studentId, courseCode, score)

**Error Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "CSV file is required under field 'file'"
}
```

---

### 4.3 Student Analytics

#### Get Performance Over Time

```http
GET /v1/grade/performance-over-time/:studentId
```

**Path Parameters:**

- `studentId` (required): Student identifier

**Example Request:**

```http
GET /v1/grade/performance-over-time/STD2023001
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "semester": "Fall 2023",
      "courses": [
        {
          "courseCode": "CS101",
          "courseName": "Introduction to CS",
          "score": 95
        },
        {
          "courseCode": "MATH201",
          "courseName": "Calculus II",
          "score": 87
        }
      ]
    },
    {
      "semester": "Spring 2024",
      "courses": [
        {
          "courseCode": "CS102",
          "courseName": "Data Structures",
          "score": 92
        }
      ]
    }
  ]
}
```

**Description:** Returns student's course performance organized by semester in chronological order.

---

#### Get Strengths & Weaknesses

```http
GET /v1/grade/strengths-weaknesses/:studentId
```

**Path Parameters:**

- `studentId` (required): Student identifier

**Example Request:**

```http
GET /v1/grade/strengths-weaknesses/STD2023001
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "courseCode": "CS101",
      "courseName": "Introduction to CS",
      "avgScore": 95.5
    },
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "avgScore": 87.25
    },
    {
      "courseCode": "ENG101",
      "courseName": "English Composition",
      "avgScore": 78.0
    }
  ]
}
```

**Description:** Returns all courses taken by student with average scores, sorted from highest to lowest (strengths first, weaknesses last).

---

### 4.4 Course Analytics

#### Get Grade Distribution by Course

```http
GET /v1/grade/grade-distribution/:courseCode
```

**Path Parameters:**

- `courseCode` (required): Course code

**Example Request:**

```http
GET /v1/grade/grade-distribution/CS101
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "A": 15,
    "B": 23,
    "C": 8,
    "D": 2
  }
}
```

**Grade Ranges:**

- A: 85-100
- B: 70-84
- C: 60-69
- D: 0-59

---

#### Get All Performances for a Course

```http
GET /v1/grade/course/:courseCode
```

**Path Parameters:**

- `courseCode` (required): Course code

**Example Request:**

```http
GET /v1/grade/course/CS101
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD2023001",
      "studentName": "John Doe",
      "batch": "2023",
      "major": "Computer Science",
      "semester": "Fall 2023",
      "courseCode": "CS101",
      "courseName": "Introduction to CS",
      "score": 95
    },
    {
      "studentId": "STD2023002",
      "studentName": "Jane Smith",
      "batch": "2023",
      "major": "Mathematics",
      "semester": "Fall 2023",
      "courseCode": "CS101",
      "courseName": "Introduction to CS",
      "score": 92
    }
  ]
}
```

**Description:** Returns all students' performance for a specific course, sorted by score (highest first).

---

#### Get Course Aggregate Statistics

```http
GET /v1/grade/course/:courseCode/aggregate?top=5
```

**Path Parameters:**

- `courseCode` (required): Course code

**Query Parameters:**

- `top` (optional, default: 5): Number of top/bottom performers to return

**Example Request:**

```http
GET /v1/grade/course/CS101/aggregate?top=3
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "courseCode": "CS101",
    "average": 87.45,
    "min": 62,
    "max": 98,
    "count": 48,
    "top": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "studentId": "STD2023001",
        "studentName": "John Doe",
        "semester": "Fall 2023",
        "score": 98
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "studentId": "STD2023003",
        "studentName": "Alice Johnson",
        "semester": "Fall 2023",
        "score": 96
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "studentId": "STD2023005",
        "studentName": "Bob Wilson",
        "semester": "Fall 2023",
        "score": 95
      }
    ],
    "bottom": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "studentId": "STD2023010",
        "studentName": "Charlie Brown",
        "semester": "Fall 2023",
        "score": 62
      },
      {
        "_id": "507f1f77bcf86cd799439015",
        "studentId": "STD2023012",
        "studentName": "David Lee",
        "semester": "Fall 2023",
        "score": 65
      },
      {
        "_id": "507f1f77bcf86cd799439016",
        "studentId": "STD2023015",
        "studentName": "Emma Davis",
        "semester": "Fall 2023",
        "score": 68
      }
    ]
  }
}
```

**Description:** Provides comprehensive statistics for a course including average, min, max scores, student count, and top/bottom performers.

---

### 4.5 Filtering by Academic Attributes

#### Get Grades by Major

```http
GET /v1/grade/major?major=Computer Science
```

**Query Parameters:**

- `major` (required): Major/field of study (case-insensitive)

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "studentId": "STD2023001",
      "studentName": "John Doe",
      "batch": "2023",
      "major": "Computer Science",
      "semester": "Fall 2023",
      "courses": [
        {
          "courseCode": "CS101",
          "courseName": "Introduction to CS",
          "score": 95
        }
      ],
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-12-15T00:00:00.000Z"
    }
  ]
}
```

---

#### Get Grades by Batch

```http
GET /v1/grade/batch/:batch
```

**Path Parameters:**

- `batch` (required): Batch/cohort year (case-insensitive)

**Example Request:**

```http
GET /v1/grade/batch/2023
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "studentId": "STD2023001",
      "studentName": "John Doe",
      "batch": "2023",
      "major": "Computer Science",
      "semester": "Fall 2023",
      "courses": [
        {
          "courseCode": "CS101",
          "courseName": "Introduction to CS",
          "score": 95
        }
      ],
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-12-15T00:00:00.000Z"
    }
  ]
}
```

---

#### Get Grades by Semester

```http
GET /v1/grade/semester/:semester
```

**Path Parameters:**

- `semester` (required): Semester name (case-insensitive)

**Example Request:**

```http
GET /v1/grade/semester/Fall 2023
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "studentId": "STD2023001",
      "studentName": "John Doe",
      "batch": "2023",
      "major": "Computer Science",
      "semester": "Fall 2023",
      "courses": [
        {
          "courseCode": "CS101",
          "courseName": "Introduction to CS",
          "score": 95
        }
      ],
      "createdAt": "2023-09-01T00:00:00.000Z",
      "updatedAt": "2023-12-15T00:00:00.000Z"
    }
  ]
}
```

---

### 4.6 Batch-Specific Analytics

#### Get Courses by Batch

```http
GET /v1/grade/batch/:batch/courses
```

**Path Parameters:**

- `batch` (required): Batch/cohort year

**Example Request:**

```http
GET /v1/grade/batch/2023/courses
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "courseCode": "CS101",
      "courseName": "Introduction to CS"
    },
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II"
    },
    {
      "courseCode": "ENG101",
      "courseName": "English Composition"
    }
  ]
}
```

**Description:** Returns distinct list of courses offered to a specific batch.

---

#### Get Batch-Semester Aggregate Statistics

```http
GET /v1/grade/batch/:batch/semester/:semester/aggregate?top=5
```

**Path Parameters:**

- `batch` (required): Batch/cohort year
- `semester` (required): Semester name

**Query Parameters:**

- `top` (optional, default: 5): Number of top/bottom performers per course

**Example Request:**

```http
GET /v1/grade/batch/2023/semester/Fall 2023/aggregate?top=3
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "courseCode": "CS101",
      "courseName": "Introduction to CS",
      "average": 87.45,
      "min": 62,
      "max": 98,
      "count": 48,
      "top": [
        {
          "studentId": "STD2023001",
          "studentName": "John Doe",
          "score": 98,
          "semester": "Fall 2023"
        },
        {
          "studentId": "STD2023003",
          "studentName": "Alice Johnson",
          "score": 96,
          "semester": "Fall 2023"
        },
        {
          "studentId": "STD2023005",
          "studentName": "Bob Wilson",
          "score": 95,
          "semester": "Fall 2023"
        }
      ],
      "bottom": [
        {
          "studentId": "STD2023010",
          "studentName": "Charlie Brown",
          "score": 62,
          "semester": "Fall 2023"
        },
        {
          "studentId": "STD2023012",
          "studentName": "David Lee",
          "score": 65,
          "semester": "Fall 2023"
        },
        {
          "studentId": "STD2023015",
          "studentName": "Emma Davis",
          "score": 68,
          "semester": "Fall 2023"
        }
      ]
    },
    {
      "courseCode": "MATH201",
      "courseName": "Calculus II",
      "average": 82.15,
      "min": 58,
      "max": 99,
      "count": 52,
      "top": [
        {
          "studentId": "STD2023002",
          "studentName": "Jane Smith",
          "score": 99,
          "semester": "Fall 2023"
        }
      ],
      "bottom": [
        {
          "studentId": "STD2023020",
          "studentName": "Frank Miller",
          "score": 58,
          "semester": "Fall 2023"
        }
      ]
    }
  ]
}
```

**Description:** Provides per-course aggregate statistics for a specific batch and semester, including top and bottom performers for each course.

---

## 5. Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

| Status Code | Meaning               | Common Scenarios                            |
| ----------- | --------------------- | ------------------------------------------- |
| 200         | OK                    | Successful GET, PUT, POST (some cases)      |
| 201         | Created               | Successful resource creation (registration) |
| 400         | Bad Request           | Validation errors, missing required fields  |
| 401         | Unauthorized          | Missing or invalid authentication token     |
| 403         | Forbidden             | Insufficient permissions for the resource   |
| 404         | Not Found             | Resource not found (user, course, etc.)     |
| 429         | Too Many Requests     | Rate limit exceeded                         |
| 500         | Internal Server Error | Server-side error                           |

### Common Error Messages

#### Authentication Errors

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

#### Validation Errors

```json
{
  "success": false,
  "message": "Email already in use"
}
```

#### Rate Limit Errors

```json
{
  "success": false,
  "message": "Too many requests"
}
```

---

## 6. Rate Limiting

### Global Rate Limits

- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP
- **Scope**: All endpoints through API Gateway

### Burst Protection

- **Window**: 1 second
- **Max Requests**: 10 requests per IP
- **Scope**: All endpoints

### Sensitive Endpoint Rate Limits

- **Endpoint**: `/v1/auth/register`
- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP

### Rate Limit Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
```

```json
{
  "success": false,
  "message": "Too many requests"
}
```

---

## 7. TypeScript Types

### For Angular Frontend

```typescript
// ============================================
// Authentication Types
// ============================================

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface VerifyAccountRequest {
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetPasswordRequest {
  code: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface CheckAuthResponse {
  success: boolean;
  message: string;
  user: {
    userId: string;
    role: "USER" | "ADMIN" | "SUPERADMIN";
  };
}

// ============================================
// Grade Service Types
// ============================================

export interface CourseScore {
  courseCode: string;
  courseName: string;
  score: number;
}

export interface SemesterPerformance {
  semester: string;
  courses: CourseScore[];
}

export interface PerformanceOverTimeResponse {
  success: boolean;
  data: SemesterPerformance[];
}

export interface StrengthWeakness {
  courseCode: string;
  courseName: string;
  avgScore: number;
}

export interface StrengthsWeaknessesResponse {
  success: boolean;
  data: StrengthWeakness[];
}

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface GradeDistributionResponse {
  success: boolean;
  data: GradeDistribution;
}

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  batch: string;
  major: string;
  semester: string;
  courseCode: string;
  courseName: string;
  score: number;
}

export interface CoursePerformancesResponse {
  success: boolean;
  data: StudentPerformance[];
}

export interface TopBottomPerformer {
  _id: string;
  studentId: string;
  studentName: string;
  semester: string;
  score: number;
}

export interface CourseAggregateData {
  courseCode: string;
  average: number;
  min: number;
  max: number;
  count: number;
  top: TopBottomPerformer[];
  bottom: TopBottomPerformer[];
}

export interface CourseAggregateResponse {
  success: boolean;
  data: CourseAggregateData;
}

export interface StudentGrades {
  _id: string;
  studentId: string;
  studentName: string;
  batch: string;
  major: string;
  semester: string;
  courses: CourseScore[];
  createdAt: string;
  updatedAt: string;
}

export interface GradesByFilterResponse {
  success: boolean;
  data: StudentGrades[];
}

export interface CourseInfo {
  courseCode: string;
  courseName: string;
}

export interface CoursesByBatchResponse {
  success: boolean;
  data: CourseInfo[];
}

export interface BatchSemesterPerformer {
  studentId: string;
  studentName: string;
  score: number;
  semester: string;
}

export interface BatchSemesterCourseAggregate {
  courseCode: string;
  courseName: string;
  average: number;
  min: number;
  max: number;
  count: number;
  top: BatchSemesterPerformer[];
  bottom: BatchSemesterPerformer[];
}

export interface BatchSemesterAggregateResponse {
  success: boolean;
  data: BatchSemesterCourseAggregate[];
}

export interface CSVUploadResponse {
  success: boolean;
  message: string;
}

// ============================================
// Generic Response Types
// ============================================

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
}

// ============================================
// CSV Upload Types
// ============================================

export interface CSVRow {
  studentId: string;
  studentName: string;
  batch: string;
  major: string;
  semester: string;
  courseCode: string;
  courseName: string;
  score: number;
}
```

---

## Angular HTTP Client Examples

### Setting up HTTP Interceptor for Credentials

```typescript
// http.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedRequest = req.clone({
    withCredentials: true, // Include cookies
  });
  return next(clonedRequest);
};
```

### Authentication Service Example

```typescript
// auth.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "http://localhost:3000/v1/auth";

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data);
  }

  verifyAccount(code: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/verify-account`, {
      code,
    });
  }

  logout(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/logout`, {});
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(
      `${this.apiUrl}/refresh-token`,
      {}
    );
  }

  checkAuth(): Observable<CheckAuthResponse> {
    return this.http.get<CheckAuthResponse>(`${this.apiUrl}/check-auth`);
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, {
      email,
    });
  }

  verifyResetPassword(code: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/verify-reset-password`, {
      code,
    });
  }

  resetPassword(newPassword: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/reset-password`, {
      newPassword,
    });
  }
}
```

### Grade Service Example

```typescript
// grade.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class GradeService {
  private apiUrl = "http://localhost:3000/v1/grade";

  constructor(private http: HttpClient) {}

  uploadCSV(file: File): Observable<CSVUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<CSVUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getPerformanceOverTime(
    studentId: string
  ): Observable<PerformanceOverTimeResponse> {
    return this.http.get<PerformanceOverTimeResponse>(
      `${this.apiUrl}/performance-over-time/${studentId}`
    );
  }

  getStrengthsWeaknesses(
    studentId: string
  ): Observable<StrengthsWeaknessesResponse> {
    return this.http.get<StrengthsWeaknessesResponse>(
      `${this.apiUrl}/strengths-weaknesses/${studentId}`
    );
  }

  getGradeDistribution(
    courseCode: string
  ): Observable<GradeDistributionResponse> {
    return this.http.get<GradeDistributionResponse>(
      `${this.apiUrl}/grade-distribution/${courseCode}`
    );
  }

  getCoursePerformances(
    courseCode: string
  ): Observable<CoursePerformancesResponse> {
    return this.http.get<CoursePerformancesResponse>(
      `${this.apiUrl}/course/${courseCode}`
    );
  }

  getCourseAggregate(
    courseCode: string,
    top: number = 5
  ): Observable<CourseAggregateResponse> {
    return this.http.get<CourseAggregateResponse>(
      `${this.apiUrl}/course/${courseCode}/aggregate?top=${top}`
    );
  }

  getGradesByMajor(major: string): Observable<GradesByFilterResponse> {
    return this.http.get<GradesByFilterResponse>(
      `${this.apiUrl}/major?major=${encodeURIComponent(major)}`
    );
  }

  getGradesByBatch(batch: string): Observable<GradesByFilterResponse> {
    return this.http.get<GradesByFilterResponse>(
      `${this.apiUrl}/batch/${batch}`
    );
  }

  getGradesBySemester(semester: string): Observable<GradesByFilterResponse> {
    return this.http.get<GradesByFilterResponse>(
      `${this.apiUrl}/semester/${encodeURIComponent(semester)}`
    );
  }

  getCoursesByBatch(batch: string): Observable<CoursesByBatchResponse> {
    return this.http.get<CoursesByBatchResponse>(
      `${this.apiUrl}/batch/${batch}/courses`
    );
  }

  getBatchSemesterAggregate(
    batch: string,
    semester: string,
    top: number = 5
  ): Observable<BatchSemesterAggregateResponse> {
    return this.http.get<BatchSemesterAggregateResponse>(
      `${this.apiUrl}/batch/${batch}/semester/${encodeURIComponent(
        semester
      )}/aggregate?top=${top}`
    );
  }
}
```

### CSV Upload Component Example

```typescript
// upload-grades.component.ts
import { Component } from "@angular/core";
import { GradeService } from "./grade.service";

@Component({
  selector: "app-upload-grades",
  template: `
    <input type="file" (change)="onFileSelected($event)" accept=".csv" />
    <button (click)="uploadFile()" [disabled]="!selectedFile">Upload</button>
    <div *ngIf="message">{{ message }}</div>
  `,
})
export class UploadGradesComponent {
  selectedFile: File | null = null;
  message: string = "";

  constructor(private gradeService: GradeService) {}

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  uploadFile(): void {
    if (this.selectedFile) {
      this.gradeService.uploadCSV(this.selectedFile).subscribe({
        next: (response) => {
          this.message = response.message;
        },
        error: (error) => {
          this.message = "Upload failed: " + error.error.message;
        },
      });
    }
  }
}
```

---

## Important Notes

### 1. Cookie Configuration

- All authentication cookies are **HTTP-only** for security
- Cookies are **automatically included** in requests when using `withCredentials: true`
- Never try to manually access or set auth cookies in Angular

### 2. CORS Configuration

- Ensure your Angular app runs on an allowed origin (localhost:3000 or localhost:3003)
- Always include `withCredentials: true` in HTTP requests

### 3. Error Handling

- Always check the `success` field in responses
- Handle both network errors and API errors
- Implement retry logic for token refresh failures

### 4. Token Refresh Strategy

- Implement an HTTP interceptor to catch 401 errors
- Automatically call refresh-token endpoint
- Retry original request with new tokens
- Redirect to login if refresh fails

### 5. CSV Upload

- CSV must follow exact column order
- Missing required fields will skip that row
- Use multipart/form-data content type
- File field name must be 'file'

### 6. Security Best Practices

- Never log sensitive data (passwords, tokens)
- Validate user input before sending to API
- Handle authentication state properly
- Clear sensitive data on logout

---

## Contact & Support

For questions or issues with the API, please contact the backend development team.

**Last Updated**: November 21, 2025  
**API Version**: 1.0.0  
**Documentation Version**: 1.0.0
