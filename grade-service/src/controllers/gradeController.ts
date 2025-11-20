import { Request, Response } from "express"
import { Readable } from "stream"
// use require() to avoid type-resolution issues in environments without installed types
const csvParser: any = require("csv-parser")
import { StudentGrades } from "../models/Grade"
import logger from "../utils/logger"

// Helper to parse CSV buffer into rows
async function parseCsvBuffer(buffer: Buffer) {
	return new Promise<any[]>((resolve, reject) => {
		const rows: any[] = []
		const stream = Readable.from(buffer)
		stream
			.pipe(
				csvParser({
					headers: [
						"studentId",
						"studentName",
						"batch",
						"major",
						"semester",
						"courseCode",
						"courseName",
						"score",
					],
					skipLines: 0,
				})
			)
			.on("data", (data: any) => {
				rows.push(data)
			})
			.on("end", () => resolve(rows))
			.on("error", (err: Error) => reject(err))
	})
}

export const uploadGrades = async (req: Request, res: Response) => {
	try {
		if (!req.file)
			return res
				.status(400)
				.json({
					success: false,
					message: "CSV file is required under field 'file'",
				})

		const rows = await parseCsvBuffer(req.file.buffer)

		for (const raw of rows) {
			const studentId = (raw.studentId || "").toString().trim()
			const studentName = (raw.studentName || "").toString().trim()
			const batch = (raw.batch || "").toString().trim()
			const major = (raw.major || "").toString().trim()
			const semester = (raw.semester || "").toString().trim()
			const courseCode = (raw.courseCode || "").toString().trim()
			const courseName = (raw.courseName || "").toString().trim()
			const score = Number(raw.score || 0)

			if (!studentId || !courseCode || Number.isNaN(score)) {
				logger.warn("Skipping invalid CSV row", raw)
				continue
			}

			const filter = { studentId, semester }
			const existing = await StudentGrades.findOne(filter)

			if (existing) {
				const idx = existing.courses.findIndex(
					(c: any) => c.courseCode === courseCode
				)
				if (idx >= 0) {
					existing.courses[idx].score = score
					if (courseName) existing.courses[idx].courseName = courseName
				} else {
					existing.courses.push({ courseCode, courseName, score })
				}
				// update studentName/batch/major if changed
				existing.studentName = studentName || existing.studentName
				existing.batch = batch || existing.batch
				existing.major = major || existing.major
				await existing.save()
			} else {
				await StudentGrades.create({
					studentId,
					studentName,
					batch,
					major,
					semester,
					courses: [{ courseCode, courseName, score }],
				})
			}
		}

		return res.status(200).json({ success: true, message: "CSV processed" })
	} catch (err) {
		logger.error("Error processing CSV upload", err)
		return res
			.status(500)
			.json({ success: false, message: "Failed to process CSV" })
	}
}

// GET /grades/performance-over-time/:studentId
export const performanceOverTime = async (req: Request, res: Response) => {
	try {
		const { studentId } = req.params
		if (!studentId)
			return res
				.status(400)
				.json({ success: false, message: "studentId required" })

		const docs = await StudentGrades.find({ studentId })
			.sort({ semester: 1 })
			.lean()

		// Return array of { semester, courses: [{ courseCode, courseName, score }] }
		const result = docs.map((d: any) => ({
			semester: d.semester,
			courses: d.courses,
		}))
		return res.json({ success: true, data: result })
	} catch (err) {
		logger.error("performanceOverTime error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/grade-distribution/:courseCode
export const gradeDistribution = async (req: Request, res: Response) => {
	try {
		const { courseCode } = req.params
		if (!courseCode)
			return res
				.status(400)
				.json({ success: false, message: "courseCode required" })

		// gather all matching course scores
		const docs = await StudentGrades.find(
			{ "courses.courseCode": courseCode },
			{ courses: 1 }
		).lean()
		const counts = { A: 0, B: 0, C: 0, D: 0 }

		for (const d of docs) {
			for (const c of d.courses) {
				if (c.courseCode !== courseCode) continue
				const s = Number(c.score)
				if (Number.isNaN(s)) continue
				if (s >= 85) counts.A++
				else if (s >= 70) counts.B++
				else if (s >= 60) counts.C++
				else counts.D++
			}
		}

		return res.json({ success: true, data: counts })
	} catch (err) {
		logger.error("gradeDistribution error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/strengths-weaknesses/:studentId
export const strengthsWeaknesses = async (req: Request, res: Response) => {
	try {
		const { studentId } = req.params
		if (!studentId)
			return res
				.status(400)
				.json({ success: false, message: "studentId required" })

		const docs = await StudentGrades.find({ studentId }).lean()

		// aggregate scores per course
		const map = new Map<
			string,
			{ courseName: string; total: number; count: number }
		>()
		for (const d of docs) {
			for (const c of d.courses) {
				const key = c.courseCode
				const entry = map.get(key) || {
					courseName: c.courseName || "",
					total: 0,
					count: 0,
				}
				entry.total += Number(c.score) || 0
				entry.count += 1
				map.set(key, entry)
			}
		}

		const result: Array<{
			courseCode: string
			courseName: string
			avgScore: number
		}> = []
		for (const [courseCode, v] of map.entries()) {
			result.push({
				courseCode,
				courseName: v.courseName,
				avgScore: Number((v.total / v.count).toFixed(2)),
			})
		}

		// sort by avgScore desc - strengths first
		result.sort((a, b) => b.avgScore - a.avgScore)

		return res.json({ success: true, data: result })
	} catch (err) {
		logger.error("strengthsWeaknesses error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/course/:courseCode
export const coursePerformances = async (req: Request, res: Response) => {
	try {
		const { courseCode } = req.params
		if (!courseCode)
			return res
				.status(400)
				.json({ success: false, message: "courseCode required" })

		// Find all students that have this course in any semester
		const docs = await StudentGrades.find({
			"courses.courseCode": courseCode,
		}).lean()

		const result: Array<any> = []
		for (const d of docs) {
			for (const c of d.courses) {
				if (c.courseCode !== courseCode) continue
				result.push({
					studentId: d.studentId,
					studentName: d.studentName,
					batch: d.batch,
					major: d.major,
					semester: d.semester,
					courseCode: c.courseCode,
					courseName: c.courseName,
					score: Number(c.score) || 0,
				})
			}
		}

		// Optionally sort by score desc
		result.sort((a, b) => b.score - a.score)

		return res.json({ success: true, data: result })
	} catch (err) {
		logger.error("coursePerformances error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/course/:courseCode/aggregate
export const courseAggregate = async (req: Request, res: Response) => {
	try {
		const { courseCode } = req.params
		const topN = Number(req.query.top) || 5
		if (!courseCode)
			return res
				.status(400)
				.json({ success: false, message: "courseCode required" })

		// Use aggregation pipeline to compute avg/min/max/count
		const pipeline = [
			{ $unwind: "$courses" },
			{ $match: { "courses.courseCode": courseCode } },
			{
				$group: {
					_id: "$courses.courseCode",
					avgScore: { $avg: "$courses.score" },
					minScore: { $min: "$courses.score" },
					maxScore: { $max: "$courses.score" },
					count: { $sum: 1 },
				},
			},
		]

		const stats = await StudentGrades.aggregate(pipeline as any)
		const stat =
			stats && stats.length
				? stats[0]
				: { avgScore: 0, minScore: 0, maxScore: 0, count: 0 }

		// top performers
		const topPipeline = [
			{ $unwind: "$courses" },
			{ $match: { "courses.courseCode": courseCode } },
			{
				$project: {
					studentId: 1,
					studentName: 1,
					semester: 1,
					score: "$courses.score",
				},
			},
			{ $sort: { score: -1 } },
			{ $limit: topN },
		]
		const top = await StudentGrades.aggregate(topPipeline as any)

		// bottom performers
		const bottomPipeline = [
			{ $unwind: "$courses" },
			{ $match: { "courses.courseCode": courseCode } },
			{
				$project: {
					studentId: 1,
					studentName: 1,
					semester: 1,
					score: "$courses.score",
				},
			},
			{ $sort: { score: 1 } },
			{ $limit: topN },
		]
		const bottom = await StudentGrades.aggregate(bottomPipeline as any)

		return res.json({
			success: true,
			data: {
				courseCode,
				average: Number((stat.avgScore || 0).toFixed(2)),
				min: stat.minScore || 0,
				max: stat.maxScore || 0,
				count: stat.count || 0,
				top,
				bottom,
			},
		})
	} catch (err) {
		logger.error("courseAggregate error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/major/:major
export const byMajor = async (req: Request, res: Response) => {
	try {
		const majorRaw = req.query.major ?? req.params.major
		const major = majorRaw ? String(majorRaw).trim() : ""
		if (!major)
			return res.status(400).json({ success: false, message: "major required" })

		// case-insensitive match on major
		const docs = await StudentGrades.find({
			major: { $regex: `^${major}$`, $options: "i" },
		}).lean()

		return res.json({ success: true, data: docs })
	} catch (err) {
		logger.error("byMajor error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/batch/:batch
export const byBatch = async (req: Request, res: Response) => {
	try {
		const { batch } = req.params
		if (!batch)
			return res.status(400).json({ success: false, message: "batch required" })

		const docs = await StudentGrades.find({
			batch: { $regex: `^${batch}$`, $options: "i" },
		}).lean()

		return res.json({ success: true, data: docs })
	} catch (err) {
		logger.error("byBatch error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /grades/semester/:semester
export const bySemester = async (req: Request, res: Response) => {
	try {
		const { semester } = req.params
		if (!semester)
			return res
				.status(400)
				.json({ success: false, message: "semester required" })

		const docs = await StudentGrades.find({
			semester: { $regex: `^${semester}$`, $options: "i" },
		}).lean()

		return res.json({ success: true, data: docs })
	} catch (err) {
		logger.error("bySemester error", err)
		return res.status(500).json({ success: false, message: "Internal error" })
	}
}

// GET /batch/:batch/courses
export const getCoursesByBatch = async (req: Request, res: Response) => {
	try {
		const batchRaw = req.params.batch || req.query.batch
		const batch = batchRaw ? String(batchRaw).trim() : ""
		if (!batch) return res.status(400).json({ success: false, message: "batch required" })

		// Aggregate distinct course codes/names for the batch
		const pipeline = [
			{ $match: { batch: { $regex: `^${batch}$`, $options: 'i' } } },
			{ $unwind: '$courses' },
			{ $group: { _id: '$courses.courseCode', courseName: { $first: '$courses.courseName' } } },
			{ $project: { courseCode: '$_id', courseName: 1, _id: 0 } },
			{ $sort: { courseCode: 1 } },
		]

		const courses = await StudentGrades.aggregate(pipeline as any)
		return res.json({ success: true, data: courses })
	} catch (err) {
		logger.error('getCoursesByBatch error', err)
		return res.status(500).json({ success: false, message: 'Internal error' })
	}
}

// GET /batch/:batch/semester/:semester/aggregate
// Returns per-course aggregate (avg/min/max/count) and top/bottom performers within that batch+semester
export const batchSemesterAggregate = async (req: Request, res: Response) => {
	try {
		const batchRaw = req.params.batch || req.query.batch
		const semesterRaw = req.params.semester || req.query.semester
		const topN = Number(req.query.top) || 5

		const batch = batchRaw ? String(batchRaw).trim() : ''
		const semester = semesterRaw ? String(semesterRaw).trim() : ''
		if (!batch || !semester) return res.status(400).json({ success: false, message: 'batch and semester required' })

		// stats per course
		const statsPipeline = [
			{ $match: { batch: { $regex: `^${batch}$`, $options: 'i' }, semester: { $regex: `^${semester}$`, $options: 'i' } } },
			{ $unwind: '$courses' },
			{ $group: { _id: '$courses.courseCode', courseName: { $first: '$courses.courseName' }, avgScore: { $avg: '$courses.score' }, minScore: { $min: '$courses.score' }, maxScore: { $max: '$courses.score' }, count: { $sum: 1 } } },
			{ $project: { courseCode: '$_id', courseName: 1, avgScore: 1, minScore: 1, maxScore: 1, count: 1, _id: 0 } },
			{ $sort: { courseCode: 1 } },
		]

		const stats = await StudentGrades.aggregate(statsPipeline as any)

		// top performers per course
		const topPipeline = [
			{ $match: { batch: { $regex: `^${batch}$`, $options: 'i' }, semester: { $regex: `^${semester}$`, $options: 'i' } } },
			{ $unwind: '$courses' },
			{ $project: { courseCode: '$courses.courseCode', courseName: '$courses.courseName', studentId: 1, studentName: 1, score: '$courses.score', semester: 1 } },
			{ $sort: { courseCode: 1, score: -1 } },
			{ $group: { _id: '$courseCode', top: { $push: { studentId: '$studentId', studentName: '$studentName', score: '$score', semester: '$semester' } } } },
			{ $project: { courseCode: '$_id', top: { $slice: ['$top', topN] }, _id: 0 } },
		]
		const tops = await StudentGrades.aggregate(topPipeline as any)

		// bottom performers per course
		const bottomPipeline = [
			{ $match: { batch: { $regex: `^${batch}$`, $options: 'i' }, semester: { $regex: `^${semester}$`, $options: 'i' } } },
			{ $unwind: '$courses' },
			{ $project: { courseCode: '$courses.courseCode', courseName: '$courses.courseName', studentId: 1, studentName: 1, score: '$courses.score', semester: 1 } },
			{ $sort: { courseCode: 1, score: 1 } },
			{ $group: { _id: '$courseCode', bottom: { $push: { studentId: '$studentId', studentName: '$studentName', score: '$score', semester: '$semester' } } } },
			{ $project: { courseCode: '$_id', bottom: { $slice: ['$bottom', topN] }, _id: 0 } },
		]
		const bottoms = await StudentGrades.aggregate(bottomPipeline as any)

		// merge stats with tops and bottoms
		const topMap = new Map<string, any>(tops.map((t: any) => [t.courseCode, t.top]))
		const bottomMap = new Map<string, any>(bottoms.map((b: any) => [b.courseCode, b.bottom]))

		const result = stats.map((s: any) => ({
			courseCode: s.courseCode,
			courseName: s.courseName,
			average: Number((s.avgScore || 0).toFixed(2)),
			min: s.minScore || 0,
			max: s.maxScore || 0,
			count: s.count || 0,
			top: topMap.get(s.courseCode) || [],
			bottom: bottomMap.get(s.courseCode) || [],
		}))

		return res.json({ success: true, data: result })
	} catch (err) {
		logger.error('batchSemesterAggregate error', err)
		return res.status(500).json({ success: false, message: 'Internal error' })
	}
}

export default {
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
}
