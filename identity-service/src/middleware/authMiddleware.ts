import { NextFunction, Request, Response } from "express"
import { UserPayload } from "../types/types"
import jwt from "jsonwebtoken"
import logger from "../utils/logger"

export const authenticateRequest = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const userIdHeader = req.headers["x-user-id"]
	const roleHeader = req.headers["x-user-role"]
	if (
		!userIdHeader ||
		Array.isArray(userIdHeader) ||
		!roleHeader ||
		Array.isArray(roleHeader)
	) {
		return res
			.status(401)
			.json({ message: "Authentication required! Please login to continue." })
	}

	const userId = userIdHeader.toString() // Keep as string for MongoDB ObjectId
	const role = roleHeader.toString()

	req.user = { userId, role } as UserPayload
	next()
}

export const authorizeRoles = (...allowedRoles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!req.user) {
			return res.status(401).json({
				message: "Unauthorized. No user found.",
			})
		}

		const user = req.user as UserPayload

		if (!allowedRoles.includes(user.role)) {
			return res.status(403).json({
				message: "Forbidden: You don't have access to this resource",
			})
		}
		next()
	}
}

export const verifyVerificationToken =
	(tokenField: string = "verificationToken") =>
	(req: Request, res: Response, next: NextFunction) => {
		const token = req.cookies?.[tokenField]
		if (!token) {
			return res
				.status(401)
				.json({ message: "Session expired or not verified." })
		}

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
			req.user = decoded as UserPayload // decoded.userId is string
			next()
		} catch (err) {
			return res
				.status(401)
				.json({ message: "Invalid or expired verification token" })
		}
	}

export const revokeVerificationToken = (
	res: Response,
	tokenField: string = "verificationToken"
) => {
	res.clearCookie(tokenField, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
	})
}
