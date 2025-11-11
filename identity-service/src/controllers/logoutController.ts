import logger from "../utils/logger"
import { RefreshToken } from "../models/RefreshToken"
import { User } from "../models/User"
import { validateRefreshToken } from "../utils/validation"
import { Request, Response } from "express"

export const logoutUser = async (req: Request, res: Response) => {
	logger.info("Logout endpoint hit")
	try {
		const refreshToken = req?.cookies.refreshToken

		const { error } = validateRefreshToken({ token: refreshToken })
		if (error) {
			logger.error("Refresh token validation error", error.details)
			return res
				.status(400)
				.json({ success: false, message: error.details[0].message })
		}

		if (!refreshToken) {
			logger.warn("refreshToken not found")
			return res.status(400).json({
				success: false,
				message: "refreshToken not found",
			})
		}

		const accessToken = req.cookies.accessToken
		if (!accessToken) {
			logger.warn("accessToken not found")
			return res.status(400).json({
				success: false,
				message: "accessToken not found",
			})
		}

		const storedToken = await RefreshToken.findOne({ token: refreshToken })

		if (!storedToken || storedToken.expiresAt < new Date()) {
			logger.error("Invalid refresh token")
			return res.status(400).json({
				success: false,
				message: "Invalid refresh token",
			})
		}

		const user = await User.findOne({ _id: storedToken.user, isVerified: true })

		if (!user) {
			logger.error("User not found")
			return res.status(404).json({ success: false, message: "User not found" })
		}

		await RefreshToken.deleteMany({ user: user._id })

		res.clearCookie("refreshToken")
		res.clearCookie("accessToken")

		logger.info("User logged out successfully")
		return res
			.status(200)
			.json({ success: true, message: "User logged out successfully" })
	} catch (err) {
		logger.error("Error logging out user", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
