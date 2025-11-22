import mongoose from "mongoose";

const csvUploadSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    rowCount: {
      type: Number,
      required: true,
      default: 0,
    },
    processedRows: {
      type: Number,
      required: true,
      default: 0,
    },
    skippedRows: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "replaced", "deleted"],
      default: "active",
    },
    metadata: {
      totalStudents: {
        type: Number,
        default: 0,
      },
      semesters: [
        {
          type: String,
        },
      ],
      batches: [
        {
          type: String,
        },
      ],
      majors: [
        {
          type: String,
        },
      ],
      courses: [
        {
          type: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

csvUploadSchema.index({ uploadedAt: -1 });
csvUploadSchema.index({ status: 1 });

export const CSVUpload = mongoose.model("CSVUpload", csvUploadSchema);
