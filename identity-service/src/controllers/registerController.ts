import logger from "../utils/logger"
import { Role, User } from "../models/User"
import argon2 from "argon2"
import { validateRegistration } from "../utils/validation"
import { RegistrationData } from "../types/types"
import { Request, Response } from "express"
import { generateVerificationToken } from "../utils/generateToken"
import { publishEvent } from "../utils/rabbitmq"

export const registerUser = async (
	req: Request<{}, {}, RegistrationData>,
	res: Response
) => {
	logger.info("Registration endpoint hit")
	try {
		const { firstName, lastName, email, password } = req.body

		const { error } = validateRegistration(req.body)
		if (error) {
			logger.error("Validation error", error.details)
			return res
				.status(400)
				.json({ success: false, message: error.details[0].message })
		}

		const existingUser = await User.findOne({ email })
		if (existingUser) {
			if (existingUser.isVerified) {
				logger.warn("Email already in use by a verified user")
				return res
					.status(400)
					.json({ success: false, message: "Email already in use" })
			} else {
				logger.warn(
					"User already signup but not yet verified. Delete the existing user"
				)
				await User.deleteOne({ email })
			}
		}

		const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString()
		const hashedPassword = await argon2.hash(password)

		const user = await User.create({
			firstName: firstName,
			lastName: lastName,
			email: email,
			password: hashedPassword,
			role: email === process.env.ADMIN_ACCOUNT ? Role.ADMIN : Role.USER,
			twoFactorCode,
			twoFactorCodeExpiry: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes from current
		})

		await generateVerificationToken(res, user._id, user.email)
		await publishEvent("identity.service", "user.registered", {
			email: user.email,
			code: twoFactorCode,
		})

		logger.info("User registered successfully", { userId: user._id })

		return res
			.status(201)
			.json({ success: true, message: "User registered successfully" })
	} catch (err) {
		logger.error("Error registering user", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
