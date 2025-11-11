import logger from "../utils/logger"
import { User } from "../models/User"
import { Request, Response } from "express"
import { generateVerificationToken } from "../utils/generateToken"
import { publishEvent } from "../utils/rabbitmq"

export const verifyResetPasswordCodeResend = async (
	req: Request,
	res: Response
) => {
	logger.info("Resend verification code request endpoint hit")
	try {
		const { userId } = req.user as { userId: string }

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

		// Generate new two-factor code
		const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString()

		user.twoFactorCode = twoFactorCode
		user.twoFactorCodeExpiry = new Date(Date.now() + 3 * 60 * 1000) // 3 minutes
		await user.save()

		await generateVerificationToken(res, user._id, user.email)
		await publishEvent("identity.service", "user.forgot_password", {
			email: user.email,
			code: twoFactorCode,
		})

		logger.info("Resend verification code request successful", {
			userId: user._id,
		})
		return res.status(200).json({
			success: true,
			message: "Resend verification code request successful",
		})
	} catch (err) {
		logger.error("Error processing resend verification code request", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
