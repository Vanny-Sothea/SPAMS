import logger from "../utils/logger"
import { User } from "../models/User"
import { validateTwoFactorCode } from "../utils/validation"
import { Request, Response } from "express"
import { publishEvent } from "../utils/rabbitmq"
import { revokeVerificationToken } from "../middleware/authMiddleware"

export const verifyAccount = async (req: Request, res: Response) => {
	logger.info("Verify account endpoint hit")
	try {
		const { code } = req.body
		const { userId } = req.user as { userId: string }

		const { error: twoFactorError } = validateTwoFactorCode({ code })
		if (twoFactorError) {
			logger.error("Two-factor code validation error", twoFactorError.details)
			return res
				.status(400)
				.json({ success: false, message: twoFactorError.details[0].message })
		}

		if (!userId) {
			logger.error("No user ID found")
			return res
				.status(400)
				.json({ success: false, message: "No user ID found" })
		}

		const user = await User.findById(userId)
		if (!user) {
			logger.error("User not found")
			return res.status(404).json({ success: false, message: "User not found" })
		}

		if (user.isVerified) {
			logger.warn("User already verified", { userId: user._id })
			return res
				.status(400)
				.json({ success: false, message: "User already verified" })
		}

		if (
			user.twoFactorCode !== code ||
			(user.twoFactorCodeExpiry && user.twoFactorCodeExpiry < new Date())
		) {
			logger.error("Invalid or expired verification code")
			return res
				.status(400)
				.json({
					success: false,
					message: "Invalid or expired verification code",
				})
		}

		// Update user as verified
		user.isVerified = true
		user.twoFactorCode = null
		user.twoFactorCodeExpiry = null
		await user.save()

		await publishEvent("identity.service", "user.verified", {
			userId: user._id,
		})
		await revokeVerificationToken(res)

		logger.info("Account verified successfully", { userId: user._id })
		return res
			.status(200)
			.json({ success: true, message: "Account verified successfully" })
	} catch (err) {
		logger.error("Error verifying account", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
