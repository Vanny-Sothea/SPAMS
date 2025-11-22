# CSV Management API - Grade Service

## Overview

This document describes the new CSV Management features added to the Grade Service. These endpoints allow you to track, view, edit, and delete CSV uploads along with their associated grade data.

---

## Base Path

`/v1/grade`

---

## Endpoints

### 1. Upload CSV with Tracking

```http
POST /v1/grade/upload
Content-Type: multipart/form-data
```

#### Request

- **Form field name**: `file`
- **File type**: CSV
- **CSV Headers** (in order):
  1. `studentId`
  2. `studentName`
  3. `batch`
  4. `major`
  5. `semester`
  6. `courseCode`
  7. `courseName`
  8. `score`

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "CSV processed",
  "data": {
    "csvUploadId": "507f1f77bcf86cd799439011",
    "filename": "grades_fall_2023.csv",
    "processedRows": 50,
    "skippedRows": 2,
    "totalStudents": 45
  }
}
```

#### Features

- ✅ Creates CSV upload record with metadata
- ✅ Links all grade records to this CSV
- ✅ Tracks processed/skipped rows
- ✅ Returns CSV ID for future operations

---

### 2. Get CSV Upload History

```http
GET /v1/grade/csv/history
```

#### Response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "filename": "grades_fall_2023.csv",
      "uploadedAt": "2023-09-01T10:30:00.000Z",
      "rowCount": 52,
      "processedRows": 50,
      "skippedRows": 2,
      "status": "active",
      "metadata": {
        "totalStudents": 45,
        "semesters": ["Fall 2023"],
        "batches": ["2023", "2022"],
        "majors": ["Computer Science", "Mathematics"],
        "courses": ["CS101", "MATH201", "ENG101"]
      }
    }
  ]
}
```

#### Features

- ✅ Lists all CSV uploads
- ✅ Shows comprehensive metadata
- ✅ Excludes deleted CSVs
- ✅ Sorted by upload date (newest first)

---

### 3. Get Specific CSV Details

```http
GET /v1/grade/csv/:csvId
```

#### Path Parameters

- `csvId` (required): CSV upload ID

#### Response: `200 OK`

```json
{
  "success": true,
  "data": {
    "upload": {
      "_id": "507f1f77bcf86cd799439011",
      "filename": "upload_1699876543210_grades_fall_2023.csv",
      "originalName": "grades_fall_2023.csv",
      "uploadedAt": "2023-09-01T10:30:00.000Z",
      "rowCount": 52,
      "processedRows": 50,
      "skippedRows": 2,
      "status": "active",
      "metadata": {
        "totalStudents": 45,
        "semesters": ["Fall 2023"],
        "batches": ["2023", "2022"],
        "majors": ["Computer Science", "Mathematics"],
        "courses": ["CS101", "MATH201", "ENG101"]
      }
    },
    "gradeRecordsCount": 50,
    "gradeRecords": [...]
  }
}
```

#### Features

- ✅ Shows complete CSV upload details
- ✅ Includes all associated grade records
- ✅ Useful for viewing what data came from this CSV

---

### 4. Update/Replace CSV

```http
PUT /v1/grade/csv/:csvId
Content-Type: multipart/form-data
```

#### Path Parameters

- `csvId` (required): CSV upload ID to replace

#### Request

- **Form field name**: `file`
- **File type**: CSV (same format as upload)

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "CSV updated successfully",
  "data": {
    "newCsvUploadId": "507f1f77bcf86cd799439013",
    "oldCsvUploadId": "507f1f77bcf86cd799439011",
    "filename": "grades_fall_2023_updated.csv",
    "processedRows": 48,
    "skippedRows": 0,
    "updatedRecords": 35,
    "newRecords": 13,
    "totalStudents": 45
  }
}
```

#### Features

- ✅ **Smart Update**: Only changes what's different
- ✅ Compares new CSV with existing data
- ✅ Updates changed records (scores, names, etc.)
- ✅ Keeps unchanged data as-is
- ✅ Adds new records if present
- ✅ Marks old CSV as "replaced"
- ✅ Creates new CSV record
- ✅ Links all data to new CSV ID

#### Update Logic

1. Old CSV marked as "replaced"
2. New CSV record created
3. For each row in new CSV:
   - If record exists from old CSV:
     - Compare all fields
     - Update only if changes detected
     - Keep unchanged fields
   - If new record:
     - Create new grade entry
4. All records linked to new CSV ID

---

### 5. Delete CSV and Data

```http
DELETE /v1/grade/csv/:csvId
```

#### Path Parameters

- `csvId` (required): CSV upload ID to delete

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "CSV and associated grades deleted successfully",
  "data": {
    "csvUploadId": "507f1f77bcf86cd799439011",
    "deletedGradeRecords": 50
  }
}
```

#### Features

- ⚠️ **Destructive Operation**
- Marks CSV as "deleted"
- Deletes ALL grade records linked to this CSV
- Cannot be undone

---

## Data Model Changes

### CSV Upload Model

```typescript
{
  _id: ObjectId,
  filename: string,              // Generated filename
  originalName: string,          // User's filename
  uploadedAt: Date,              // Upload timestamp
  rowCount: number,              // Total rows in CSV
  processedRows: number,         // Successfully processed
  skippedRows: number,           // Skipped (invalid data)
  status: 'active' | 'replaced' | 'deleted',
  metadata: {
    totalStudents: number,
    semesters: string[],
    batches: string[],
    majors: string[],
    courses: string[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Student Grades Model (Updated)

```typescript
{
  _id: ObjectId,
  studentId: string,
  studentName: string,
  batch: string,
  major: string,
  semester: string,
  courses: [
    {
      courseCode: string,
      courseName: string,
      score: number
    }
  ],
  csvUploadId: ObjectId,         // NEW: Link to CSV upload
  createdAt: Date,
  updatedAt: Date
}
```

---

## Use Cases

### Scenario 1: Upload Initial Grades

```javascript
// 1. Upload CSV
POST / v1 / grade / upload;
// Receive csvUploadId: "abc123"

// 2. View history
GET / v1 / grade / csv / history;
// See the uploaded CSV in the list

// 3. View details
GET / v1 / grade / csv / abc123;
// See all grade records from this CSV
```

### Scenario 2: Fix Mistakes in CSV

```javascript
// 1. Principal uploads grades_fall.csv
POST / v1 / grade / upload;
// csvUploadId: "abc123"

// 2. Realizes some scores are wrong
// 3. Updates CSV file with corrections
PUT / v1 / grade / csv / abc123;
// uploads grades_fall_corrected.csv
// Receive newCsvUploadId: "xyz789"

// 4. System compares and updates only changed data
// updatedRecords: 5 (5 scores changed)
// newRecords: 0 (no new students)

// 5. Old CSV marked as "replaced"
GET / v1 / grade / csv / history;
// Shows both CSVs with their status
```

### Scenario 3: Delete Incorrect Upload

```javascript
// 1. Uploaded wrong semester's data
POST / v1 / grade / upload;
// csvUploadId: "wrong123"

// 2. Realize mistake immediately
DELETE / v1 / grade / csv / wrong123;

// 3. All grade records from that CSV removed
// CSV marked as "deleted"
```

---

## TypeScript Types for Angular

```typescript
// CSV Upload Response
export interface CSVUploadResponse {
  success: boolean;
  message: string;
  data: {
    csvUploadId: string;
    filename: string;
    processedRows: number;
    skippedRows: number;
    totalStudents: number;
  };
}

// CSV History Item
export interface CSVHistoryItem {
  _id: string;
  filename: string;
  uploadedAt: string;
  rowCount: number;
  processedRows: number;
  skippedRows: number;
  status: "active" | "replaced" | "deleted";
  metadata: {
    totalStudents: number;
    semesters: string[];
    batches: string[];
    majors: string[];
    courses: string[];
  };
}

// CSV History Response
export interface CSVHistoryResponse {
  success: boolean;
  data: CSVHistoryItem[];
}

// CSV Details Response
export interface CSVDetailsResponse {
  success: boolean;
  data: {
    upload: CSVHistoryItem & {
      filename: string;
      originalName: string;
      createdAt: string;
      updatedAt: string;
    };
    gradeRecordsCount: number;
    gradeRecords: StudentGrades[];
  };
}

// Update CSV Response
export interface UpdateCSVResponse {
  success: boolean;
  message: string;
  data: {
    newCsvUploadId: string;
    oldCsvUploadId: string;
    filename: string;
    processedRows: number;
    skippedRows: number;
    updatedRecords: number;
    newRecords: number;
    totalStudents: number;
  };
}

// Delete CSV Response
export interface DeleteCSVResponse {
  success: boolean;
  message: string;
  data: {
    csvUploadId: string;
    deletedGradeRecords: number;
  };
}
```

---

## Angular Service Example

```typescript
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CSVManagementService {
  private apiUrl = "http://localhost:3000/v1/grade";

  constructor(private http: HttpClient) {}

  // Upload CSV with tracking
  uploadCSV(file: File): Observable<CSVUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<CSVUploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  // Get CSV history
  getCSVHistory(): Observable<CSVHistoryResponse> {
    return this.http.get<CSVHistoryResponse>(`${this.apiUrl}/csv/history`);
  }

  // Get CSV details
  getCSVDetails(csvId: string): Observable<CSVDetailsResponse> {
    return this.http.get<CSVDetailsResponse>(`${this.apiUrl}/csv/${csvId}`);
  }

  // Update/Replace CSV
  updateCSV(csvId: string, file: File): Observable<UpdateCSVResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.put<UpdateCSVResponse>(
      `${this.apiUrl}/csv/${csvId}`,
      formData
    );
  }

  // Delete CSV and associated data
  deleteCSV(csvId: string): Observable<DeleteCSVResponse> {
    return this.http.delete<DeleteCSVResponse>(`${this.apiUrl}/csv/${csvId}`);
  }
}
```

---

## Important Notes

### Security & Access

- ✅ No authentication required (as per requirements)
- ✅ Everyone with system access can manage CSVs
- ⚠️ Anyone can delete any CSV - use with caution

### Data Integrity

- ✅ All grade records link back to their source CSV
- ✅ Can trace any grade back to its upload
- ✅ Update operation preserves unchanged data
- ✅ Smart comparison prevents unnecessary updates

### Best Practices

1. **Always check CSV history** before uploading duplicate data
2. **Use update endpoint** when fixing mistakes in existing CSV
3. **Download/backup** before deleting (deletion is permanent)
4. **Review details** before deleting to see affected records
5. **Use meaningful filenames** for easy identification

---

## Migration Notes

If you have existing grade data (before implementing CSV tracking):

- Old grades will have `csvUploadId: null`
- They will still work with all analytics endpoints
- New uploads will have proper CSV tracking
- Consider creating a "migration" CSV upload record for old data

---

**Last Updated**: November 21, 2025  
**Version**: 2.0.0
