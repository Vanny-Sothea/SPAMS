import dotenv from "dotenv"
dotenv.config()

import express, { NextFunction, Request, Response } from "express"
import Redis from "ioredis"
import cors from "cors"
import helmet from "helmet"
import { rateLimit } from "express-rate-limit"
import { RedisStore } from "rate-limit-redis"
import type { RedisReply } from "rate-limit-redis"
import logger from "./utils/logger"
import errorHandler from "./middleware/errorHandler"
import { validationToken } from "./middleware/authMiddleware"
import { createProxy } from "./utils/proxyHelpers"
import cookieParser from "cookie-parser"

const app = express()
const PORT = process.env.PORT || 3000

if (!process.env.REDIS_URL) {
	logger.error("REDIS_URL is not defined")
	process.exit(1)
}

const redisClient = new Redis(
	process.env.REDIS_URL,
	process.env.NODE_ENV === "production"
		? { tls: { rejectUnauthorized: false } }
		: {}
)

redisClient.on("connect", () => {
	logger.info("Connected to Redis")
})

redisClient.on("error", (err) => {
	logger.error("Redis error", { error: err })
})

app.set("trust proxy", 1)
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:3003",
]

const corsOptions = {
	origin: (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) => {
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true)
		} else {
			callback(new Error(`CORS blocked: ${origin}`))
		}
	},
	credentials: true,
	allowedHeaders: ["Content-Type", "Authorization"],
	methods: ["GET", "POST", "PUT", "DELETE"],
}

app.use(cors(corsOptions))
const getClientIp = (req: Request): string => req.ip || "unknown"

const globalRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 Mins
	max: 100, //100 requests
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		logger.warn(`Rate limit exceeded for IP: ${getClientIp(req)}`)
		return res.status(429).json({
			success: false,
			message: "Too many requests",
		})
	},
	store: new RedisStore({
		sendCommand: (
			command: string,
			...args: (string | Buffer | number)[]
		): Promise<RedisReply> => {
			return redisClient.call(command, ...args) as Promise<RedisReply>
		},
	}),
})

app.use(globalRateLimiter)

app.use((req, res, next) => {
	logger.info(
		`Received ${req.method} request to ${req.url} from IP: ${getClientIp(req)}`
	)
	if (req.is("application/json")) {
		logger.info(`Request body: ${JSON.stringify(req.body)}`)
	} else {
		logger.info("Request body: N/A (non-JSON or file upload)")
	}
	next()
})

const captureUrl = (req: Request, res: Response, next: NextFunction) => {
	res.locals.proxyUrl = req.originalUrl
	next()
}

if (!process.env.IDENTITY_SERVICE_URL) {
	logger.error("IDENTITY_SERVICE_URL is not defined")
	process.exit(1)
}

app.use(
	"/v1/auth",
	captureUrl,
	validationToken,
	createProxy(process.env.IDENTITY_SERVICE_URL, "identity service")
)

if (!process.env.GRADE_SERVICE_URL) {
	logger.error("GRADE_SERVICE_URL is not defined")
	process.exit(1)
}

app.use(
	"/v1/grade",
	captureUrl,
	validationToken,
	// Allow multipart/form-data (file uploads) to pass through without
	// parsing or Content-Type modification. The proxy helper will avoid
	// setting Content-Type to application/json and will not parse the body.
	createProxy(process.env.GRADE_SERVICE_URL, "grade service", { type: "multipart" })
)

if (!process.env.NOTIFICATION_SERVICE_URL) {
	logger.error("NOTIFICATION_SERVICE_URL is not defined")
	process.exit(1)
}

app.use(
	"/v1/notification",
	captureUrl,
	validationToken,
	createProxy(process.env.NOTIFICATION_SERVICE_URL, "notification service")
)

app.use(errorHandler)
app.get("/ping", (req, res) => {
	res.json({ message: "PONG" })
})

async function startServer() {
	try {
		app.listen(PORT, () => {
			logger.info(`API Gateway is running on port ${PORT}`)
			logger.info(
				`Identity service proxy target: ${process.env.IDENTITY_SERVICE_URL}`
			)

			logger.info(
				`Grade service proxy target: ${process.env.GRADE_SERVICE_URL}`
			)

			logger.info(
				`Notification service proxy target: ${process.env.NOTIFICATION_SERVICE_URL}`
			)
		})
	} catch (e) {
		logger.error("Failed to start server:", e)
		process.exit(1)
	}
}

startServer()

process.on("unhandledRejection", (reason, promise) => {
	logger.error("Unhandled rejection", { promise, reason })
})
