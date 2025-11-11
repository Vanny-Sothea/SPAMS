import logger from "../utils/logger"
import { User } from "../models/User"
import { Request, Response } from "express"
import { validateTwoFactorCode } from "../utils/validation"
import { generateResetPasswordToken } from "../utils/generateToken"
import { revokeVerificationToken } from "../middleware/authMiddleware"
import { UserType } from "../types/types"

export const verifyResetPassword = async (req: Request, res: Response) => {
	logger.info("Verify reset password endpoint hit")
	try {
		const { userId } = req.user as { userId: string }
		const { code } = req.body

		const { error: twoFactorError } = validateTwoFactorCode({ code })
		if (twoFactorError) {
			logger.error("Two-factor code validation error", twoFactorError.details)
			return res
				.status(400)
				.json({ success: false, message: twoFactorError.details[0].message })
		}

		const user = await User.findById(userId)
		if (!user) {
			logger.error("User not found")
			return res.status(404).json({ success: false, message: "User not found" })
		}

		if (!user.isVerified) {
			logger.error("User account is not verified")
			return res
				.status(400)
				.json({ success: false, message: "User not verified" })
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

		// Clear the verification token cookie
		await revokeVerificationToken(res)

		// Generate reset password token
		await generateResetPasswordToken(res, user as UserType)

		logger.info("Account verified successfully, ready to reset password", {
			userId: user._id,
		})
		return res.status(200).json({
			success: true,
			message: "Account verified successfully, ready to reset password",
		})
	} catch (err) {
		logger.error("Error verifying account for reset password", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
