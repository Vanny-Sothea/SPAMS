import express from "express";
// use require() to avoid type-resolution issues when types are not installed
const multer: any = require("multer");
import {
  uploadGrades,
  performanceOverTime,
  gradeDistribution,
  strengthsWeaknesses,
  coursePerformances,
  byMajor,
  byBatch,
  bySemester,
  courseAggregate,
  getCoursesByBatch,
  batchSemesterAggregate,
  getAllGrades,
  getCsvHistory,
  getCsvById,
  updateCsv,
  deleteCsv,
  courseSearch,
} from "../controllers/gradeController";

// If you have auth middleware, you can uncomment and use it
// import { authenticateRequest, authorizeRoles } from "../middleware/authMiddleware"

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/ping", (req, res) => {
  res.status(200).json({ message: "PONG" });
});

// CSV upload: multipart/form-data with file field 'file'
router.post("/upload", upload.single("file"), uploadGrades);
// router.post("/csv/upload", upload.single("file"), uploadCsvGrades);
router.get("/csv/history", getCsvHistory);
router.get("/csv/:csvId", getCsvById);
router.put("/csv/:csvId", upload.single("file"), updateCsv);
router.delete("/csv/:csvId", deleteCsv);

// Analytics
router.get("/all", getAllGrades);
router.get("/performance-over-time/:studentId", performanceOverTime);
router.get("/grade-distribution/:courseCode", gradeDistribution);
router.get("/strengths-weaknesses/:studentId", strengthsWeaknesses);
// Course search must come before /course/:courseCode to avoid route conflict
router.get("/courses/search", courseSearch);
router.get("/course/:courseCode", coursePerformances);
router.get("/major", byMajor);
router.get("/batch/:batch", byBatch);
router.get("/semester/:semester", bySemester);
router.get("/course/:courseCode/aggregate", courseAggregate);
router.get("/batch/:batch/courses", getCoursesByBatch);
router.get(
  "/batch/:batch/semester/:semester/aggregate",
  batchSemesterAggregate
);

export default router;
