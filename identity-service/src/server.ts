import dotenv from "dotenv"
dotenv.config()

import express from "express"
import helmet from "helmet"
import mongoose from "mongoose"
import { RateLimiterRedis } from "rate-limiter-flexible"
import { Redis } from "ioredis"
import { rateLimit } from "express-rate-limit"
import { RedisReply, RedisStore } from "rate-limit-redis"
import cookieParser from "cookie-parser"
import logger from "./utils/logger"
import errorHandler from "./middleware/errorHandler"
import router from "./routes/auth-service"
import { connectToRabbitMQ } from "./utils/rabbitmq"

const app = express()
const PORT = process.env.PORT || 3001

if (!process.env.MONGODB_URI) {
	logger.error("MONGODB_URI is not defined")
	process.exit(1)
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('MongoDB Connected Successfully'))
    .catch(e => logger.error('MongoDB Connection Error', e));

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

const getClientIp = (req: express.Request): string => {
	const xff = req.headers["x-forwarded-for"]
	if (xff) {
		const ipList = xff.toString().split(",")
		return ipList[0].trim()
	}
	return req.ip || "unknown"
}

// IP based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 Mins
	max: 100, //100 requests
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		logger.warn(
			`Sensitive endpoint rate limit exceeded for IP: ${getClientIp(req)}`
		)
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

// Burst protection per IP (short duration)
const burstLimiter = new RateLimiterRedis({
	storeClient: redisClient,
	keyPrefix: "middleware",
	points: 10, // 10 requests
	duration: 1, // per 1 second by IP
})

app.use((req, res, next) => {
	burstLimiter
		.consume(getClientIp(req))
		.then(() => next())
		.catch(() => {
			logger.warn(`Burst limit exceeded for IP: ${getClientIp(req)}`)
			return res.status(429).json({
				success: false,
				message: "Too many requests",
			})
		})
})

// Stricter rate limiting only for sensitive endpoints (register/login/etc.)
app.use("/api/auth/register", sensitiveEndpointsLimiter)

// Global per-IP rate limiting (short burst protection)
app.use("/api/auth", router)
app.use(errorHandler)

async function startServer() {
	try {
		await connectToRabbitMQ()
		app.listen(PORT, () => {
			logger.info(`Identity service running on port ${PORT}`)
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
