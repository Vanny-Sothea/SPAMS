import express from "express"
// use require() to avoid type-resolution issues when types are not installed
const multer: any = require("multer")
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
} from "../controllers/gradeController"

// If you have auth middleware, you can uncomment and use it
// import { authenticateRequest, authorizeRoles } from "../middleware/authMiddleware"

const router = express.Router()

const upload = multer({ storage: multer.memoryStorage() })

router.get("/ping", (req, res) => {
	res.status(200).json({ message: "PONG" })
})

// CSV upload: multipart/form-data with file field 'file'
router.post("/upload", upload.single("file"), uploadGrades)

// Analytics
router.get("/performance-over-time/:studentId", performanceOverTime)
router.get("/grade-distribution/:courseCode", gradeDistribution)
router.get("/strengths-weaknesses/:studentId", strengthsWeaknesses)
router.get("/course/:courseCode", coursePerformances)
router.get("/major", byMajor)
router.get("/batch/:batch", byBatch)
router.get("/semester/:semester", bySemester)
router.get("/course/:courseCode/aggregate", courseAggregate)
router.get("/batch/:batch/courses", getCoursesByBatch)
router.get("/batch/:batch/semester/:semester/aggregate", batchSemesterAggregate)

export default router
