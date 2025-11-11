import logger from "../utils/logger"
import { User } from "../models/User"
import argon2 from "argon2"
import { validateResetPassword } from "../utils/validation"
import { Request, Response } from "express"
import { revokeVerificationToken } from "../middleware/authMiddleware"
import { publishEvent } from "../utils/rabbitmq"

export const resetPasswordUser = async (req: Request, res: Response) => {
	logger.info("Reset password endpoint hit")
	try {
		const { userId } = req.user as { userId: string };
		const { newPassword } = req.body

		const { error: InputError } = validateResetPassword({ newPassword })

		if (InputError) {
			logger.error("Input validation error", InputError.details)
			return res
				.status(400)
				.json({ success: false, message: InputError.details[0].message })
		}

		const user = await User.findById(userId);

		if (!user) {
			logger.error("User not found")
			return res.status(404).json({ success: false, message: "User not found" })
		}

		if (!user.isVerified) {
			logger.error("User account is not verified")
			return res.status(400).json({ success: false, message: "User not found" })
		}

		const hashedPassword = await argon2.hash(newPassword)

		await User.updateOne({
			_id: user._id
		}, {
			password: hashedPassword,
			twoFactorCode: null,
			twoFactorCodeExpiry: null,
		})

		await publishEvent("identity.service", "user.reset_password.successful", {
			email: user.email,
		})
		await revokeVerificationToken(res, "resetPasswordToken")

		logger.info("Password reset successful", { userId: user._id })
		return res.status(200).json({
			success: true,
			message: "Password reset successful",
		})
	} catch (err) {
		logger.error("Error processing password reset", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
