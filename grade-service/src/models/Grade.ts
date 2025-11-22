import mongoose from "mongoose";

const studentGradesSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    batch: { type: String, required: true },
    major: { type: String, required: true },
    semester: { type: String, required: false },
    courses: [
      {
        courseCode: { type: String, required: true },
        courseName: { type: String, required: false },
        score: { type: Number, required: true },
      },
    ],
    csvUploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CSVUpload",
      required: false,
    },
  },
  { timestamps: true }
);

// Optional index for searching
studentGradesSchema.index({ studentId: 1, batch: 1 });
studentGradesSchema.index({ csvUploadId: 1 });

export const StudentGrades = mongoose.model(
  "StudentGrades",
  studentGradesSchema
);
