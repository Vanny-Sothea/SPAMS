# KSMS Backend - Frontend Data Schema Guide

## Overview

This document provides detailed schema specifications for the KSMS (Knowledge and Student Management System) backend services. When the principal uploads a CSV file containing student information for a semester, the frontend should parse, validate, and filter the data according to these schemas before sending it to the respective backend services.

---

## Table of Contents

1. [Student Service Schema](#1-student-service-schema)
2. [Course Service Schema](#2-course-service-schema)
3. [Grade Service Schema](#3-grade-service-schema)
4. [CSV Processing Workflow](#4-csv-processing-workflow)
5. [Data Validation Rules](#5-data-validation-rules)
6. [Complete Example](#6-complete-example)

---

## 1. Student Service Schema

### API Endpoint

- **Base URL**: `/api/student`
- **Service Port**: Configured in environment variables

### Data Model

```typescript
interface Student {
  name: string; // Required
  studentId: string; // Required, Unique
  major: string; // Required
  batch: string; // Required
  enrolled_courses: string[]; // Array of course codes
}
```

### Field Specifications

| Field              | Type     | Required    | Constraints           | Description                                        |
| ------------------ | -------- | ----------- | --------------------- | -------------------------------------------------- |
| `name`             | string   | ✅ Yes      | Non-empty             | Full name of the student                           |
| `studentId`        | string   | ✅ Yes      | Unique, Non-empty     | Unique identifier for the student                  |
| `major`            | string   | ✅ Yes      | Non-empty             | Student's major/field of study                     |
| `batch`            | string   | ✅ Yes      | Non-empty             | Student's batch/cohort (e.g., "2023", "Fall 2023") |
| `enrolled_courses` | string[] | ⚠️ Optional | Array of course codes | List of course codes the student is enrolled in    |

### Automatic Fields

- `_id`: MongoDB ObjectId (auto-generated)
- `createdAt`: ISO 8601 timestamp (auto-generated)
- `updatedAt`: ISO 8601 timestamp (auto-generated)

### Example JSON Payload

```json
{
  "name": "John Doe",
  "studentId": "STD2023001",
  "major": "Computer Science",
  "batch": "2023",
  "enrolled_courses": ["CS101", "MATH201", "ENG101"]
}
```

---

## 2. Course Service Schema

### API Endpoint

- **Base URL**: `/api/course`
- **Service Port**: Configured in environment variables

### Data Model

```typescript
interface Course {
  code: string; // Required, Unique
  name: string; // Required
  semester: string; // Required
}
```

### Field Specifications

| Field      | Type   | Required | Constraints       | Description                                          |
| ---------- | ------ | -------- | ----------------- | ---------------------------------------------------- |
| `code`     | string | ✅ Yes   | Unique, Non-empty | Unique course code (e.g., "CS101")                   |
| `name`     | string | ✅ Yes   | Non-empty         | Full name of the course                              |
| `semester` | string | ✅ Yes   | Non-empty         | Semester offering (e.g., "Fall 2023", "Spring 2024") |

### Automatic Fields

- `_id`: MongoDB ObjectId (auto-generated)
- `createdAt`: ISO 8601 timestamp (auto-generated)
- `updatedAt`: ISO 8601 timestamp (auto-generated)

### Example JSON Payload

```json
{
  "code": "CS101",
  "name": "Introduction to Computer Science",
  "semester": "Fall 2023"
}
```

---

## 3. Grade Service Schema

### API Endpoint

- **Base URL**: `/api/grade`
- **Service Port**: Configured in environment variables

### Data Model

```typescript
interface Grade {
  student_id: string; // Required
  course_code: string; // Required
  grade: "A" | "B" | "C" | "D" | "F"; // Required, Enum
  numeric_grade: number; // Required
  date?: Date; // Optional, defaults to current date
}
```

### Field Specifications

| Field           | Type   | Required    | Constraints                             | Description                               |
| --------------- | ------ | ----------- | --------------------------------------- | ----------------------------------------- |
| `student_id`    | string | ✅ Yes      | Must match existing student             | Reference to student's ID                 |
| `course_code`   | string | ✅ Yes      | Must match existing course              | Reference to course code                  |
| `grade`         | string | ✅ Yes      | Must be one of: "A", "B", "C", "D", "F" | Letter grade                              |
| `numeric_grade` | number | ✅ Yes      | Valid number                            | Numeric representation of grade           |
| `date`          | Date   | ⚠️ Optional | ISO 8601 format                         | Date grade was assigned (defaults to now) |

### Grade Conversion Reference

| Letter Grade | Typical Numeric Range |
| ------------ | --------------------- |
| A            | 90-100 or 4.0         |
| B            | 80-89 or 3.0          |
| C            | 70-79 or 2.0          |
| D            | 60-69 or 1.0          |
| F            | 0-59 or 0.0           |

### Automatic Fields

- `_id`: MongoDB ObjectId (auto-generated)
- `createdAt`: ISO 8601 timestamp (auto-generated)
- `updatedAt`: ISO 8601 timestamp (auto-generated)
- `date`: Defaults to current date if not provided

### Example JSON Payload

```json
{
  "student_id": "STD2023001",
  "course_code": "CS101",
  "grade": "A",
  "numeric_grade": 95
}
```

---

## 4. CSV Processing Workflow

### Recommended CSV Column Structure

Your principal's CSV file should ideally contain columns that map to all three services. Here's a suggested structure:

```csv
Student ID,Student Name,Major,Batch,Course Code,Course Name,Semester,Grade,Numeric Grade
STD2023001,John Doe,Computer Science,2023,CS101,Introduction to Computer Science,Fall 2023,A,95
STD2023001,John Doe,Computer Science,2023,MATH201,Calculus II,Fall 2023,B,87
STD2023002,Jane Smith,Mathematics,2023,MATH201,Calculus II,Fall 2023,A,92
```

### Frontend Processing Steps

```typescript
// Step 1: Parse CSV to JSON
const csvData = parseCSV(uploadedFile);

// Step 2: Extract and deduplicate data for each service
const students = extractStudents(csvData);
const courses = extractCourses(csvData);
const grades = extractGrades(csvData);

// Step 3: Validate data against schemas
const validatedStudents = validateStudents(students);
const validatedCourses = validateCourses(courses);
const validatedGrades = validateGrades(grades);

// Step 4: Send to respective services
await sendToStudentService(validatedStudents);
await sendToCourseService(validatedCourses);
await sendToGradeService(validatedGrades);
```

### Data Extraction Logic

#### Extract Students

```typescript
function extractStudents(csvRows: CSVRow[]): Student[] {
  // Group by studentId to avoid duplicates
  const studentMap = new Map<string, Student>();

  csvRows.forEach((row) => {
    if (!studentMap.has(row.studentId)) {
      studentMap.set(row.studentId, {
        name: row.studentName,
        studentId: row.studentId,
        major: row.major,
        batch: row.batch,
        enrolled_courses: [],
      });
    }

    // Add course to enrolled_courses if present
    if (row.courseCode) {
      const student = studentMap.get(row.studentId);
      if (!student.enrolled_courses.includes(row.courseCode)) {
        student.enrolled_courses.push(row.courseCode);
      }
    }
  });

  return Array.from(studentMap.values());
}
```

#### Extract Courses

```typescript
function extractCourses(csvRows: CSVRow[]): Course[] {
  // Group by course code to avoid duplicates
  const courseMap = new Map<string, Course>();

  csvRows.forEach((row) => {
    if (row.courseCode && !courseMap.has(row.courseCode)) {
      courseMap.set(row.courseCode, {
        code: row.courseCode,
        name: row.courseName,
        semester: row.semester,
      });
    }
  });

  return Array.from(courseMap.values());
}
```

#### Extract Grades

```typescript
function extractGrades(csvRows: CSVRow[]): Grade[] {
  // Each row typically represents one grade entry
  return csvRows
    .filter((row) => row.grade && row.courseCode)
    .map((row) => ({
      student_id: row.studentId,
      course_code: row.courseCode,
      grade: row.grade as "A" | "B" | "C" | "D" | "F",
      numeric_grade: parseFloat(row.numericGrade),
    }));
}
```

---

## 5. Data Validation Rules

### Student Validation

```typescript
function validateStudent(student: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!student.name || student.name.trim() === "") {
    errors.push("Student name is required");
  }

  if (!student.studentId || student.studentId.trim() === "") {
    errors.push("Student ID is required");
  }

  if (!student.major || student.major.trim() === "") {
    errors.push("Major is required");
  }

  if (!student.batch || student.batch.trim() === "") {
    errors.push("Batch is required");
  }

  // Type validation
  if (student.enrolled_courses && !Array.isArray(student.enrolled_courses)) {
    errors.push("enrolled_courses must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Course Validation

```typescript
function validateCourse(course: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!course.code || course.code.trim() === "") {
    errors.push("Course code is required");
  }

  if (!course.name || course.name.trim() === "") {
    errors.push("Course name is required");
  }

  if (!course.semester || course.semester.trim() === "") {
    errors.push("Semester is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Grade Validation

```typescript
function validateGrade(grade: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validGrades = ["A", "B", "C", "D", "F"];

  // Required fields
  if (!grade.student_id || grade.student_id.trim() === "") {
    errors.push("Student ID is required");
  }

  if (!grade.course_code || grade.course_code.trim() === "") {
    errors.push("Course code is required");
  }

  if (!grade.grade || !validGrades.includes(grade.grade)) {
    errors.push("Grade must be one of: A, B, C, D, F");
  }

  if (typeof grade.numeric_grade !== "number" || isNaN(grade.numeric_grade)) {
    errors.push("Numeric grade must be a valid number");
  }

  // Optional date validation
  if (
    grade.date &&
    !(grade.date instanceof Date) &&
    !isValidISODate(grade.date)
  ) {
    errors.push("Date must be a valid ISO 8601 date string");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## 6. Complete Example

### Sample CSV Input

```csv
Student ID,Student Name,Major,Batch,Course Code,Course Name,Semester,Grade,Numeric Grade
STD2023001,John Doe,Computer Science,2023,CS101,Introduction to Computer Science,Fall 2023,A,95
STD2023001,John Doe,Computer Science,2023,MATH201,Calculus II,Fall 2023,B,87
STD2023001,John Doe,Computer Science,2023,ENG101,English Composition,Fall 2023,A,92
STD2023002,Jane Smith,Mathematics,2023,MATH201,Calculus II,Fall 2023,A,98
STD2023002,Jane Smith,Mathematics,2023,PHYS101,Physics I,Fall 2023,B,85
```

### Processed Data for Each Service

#### Student Service Payload

```json
[
  {
    "name": "John Doe",
    "studentId": "STD2023001",
    "major": "Computer Science",
    "batch": "2023",
    "enrolled_courses": ["CS101", "MATH201", "ENG101"]
  },
  {
    "name": "Jane Smith",
    "studentId": "STD2023002",
    "major": "Mathematics",
    "batch": "2023",
    "enrolled_courses": ["MATH201", "PHYS101"]
  }
]
```

#### Course Service Payload

```json
[
  {
    "code": "CS101",
    "name": "Introduction to Computer Science",
    "semester": "Fall 2023"
  },
  {
    "code": "MATH201",
    "name": "Calculus II",
    "semester": "Fall 2023"
  },
  {
    "code": "ENG101",
    "name": "English Composition",
    "semester": "Fall 2023"
  },
  {
    "code": "PHYS101",
    "name": "Physics I",
    "semester": "Fall 2023"
  }
]
```

#### Grade Service Payload

```json
[
  {
    "student_id": "STD2023001",
    "course_code": "CS101",
    "grade": "A",
    "numeric_grade": 95
  },
  {
    "student_id": "STD2023001",
    "course_code": "MATH201",
    "grade": "B",
    "numeric_grade": 87
  },
  {
    "student_id": "STD2023001",
    "course_code": "ENG101",
    "grade": "A",
    "numeric_grade": 92
  },
  {
    "student_id": "STD2023002",
    "course_code": "MATH201",
    "grade": "A",
    "numeric_grade": 98
  },
  {
    "student_id": "STD2023002",
    "course_code": "PHYS101",
    "grade": "B",
    "numeric_grade": 85
  }
]
```

---

## Additional Notes

### Service Dependencies

1. **Courses should be created first** - Before students or grades
2. **Students should be created second** - Before grades
3. **Grades should be created last** - After students and courses exist

### Error Handling

- Each service should return appropriate HTTP status codes
- Frontend should handle validation errors before sending data
- Implement retry logic for network failures
- Log all errors for debugging

### Best Practices

- **Batch Processing**: Consider sending data in batches rather than one record at a time
- **Unique Constraint Handling**: Handle duplicate studentId and course code errors gracefully
- **Data Cleanup**: Trim whitespace from all string fields
- **Case Sensitivity**: Maintain consistent casing (especially for course codes and student IDs)

### Security Considerations

- All endpoints require authentication (JWT token in cookies)
- Principal should have ADMIN role to upload data
- Rate limiting is applied (10 requests per second burst, 100 requests per 15 minutes)
- Use HTTPS in production

---

## TypeScript Type Definitions

For your Angular frontend, here are the complete TypeScript interfaces:

```typescript
// student.interface.ts
export interface Student {
  name: string;
  studentId: string;
  major: string;
  batch: string;
  enrolled_courses: string[];
}

// course.interface.ts
export interface Course {
  code: string;
  name: string;
  semester: string;
}

// grade.interface.ts
export type LetterGrade = "A" | "B" | "C" | "D" | "F";

export interface Grade {
  student_id: string;
  course_code: string;
  grade: LetterGrade;
  numeric_grade: number;
  date?: Date | string;
}

// csv-row.interface.ts
export interface CSVRow {
  studentId: string;
  studentName: string;
  major: string;
  batch: string;
  courseCode: string;
  courseName: string;
  semester: string;
  grade: LetterGrade;
  numericGrade: string | number;
}

// validation-result.interface.ts
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProcessedData {
  students: Student[];
  courses: Course[];
  grades: Grade[];
}
```

---

## Contact & Support

For questions or clarifications about these schemas, please contact the backend development team or refer to the individual service documentation in their respective directories.

**Last Updated**: November 18, 2025  
**Version**: 1.0.0
