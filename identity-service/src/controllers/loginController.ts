import logger from "../utils/logger"
import argon2 from "argon2"
import { validateLogin } from "../utils/validation"
import { Request, Response } from "express"
import { generateTokens } from "../utils/generateToken"
import { UserType } from "../types/types"
import { User } from "../models/User"

export const loginUser = async (req: Request, res: Response) => {
	logger.info("Login user endpoint hit")
	try {
		const { error } = validateLogin(req.body)
		if (error) {
			logger.error("Login validation error", error.details)
			return res
				.status(400)
				.json({ success: false, message: error.details[0].message })
		}

		const { email, password } = req.body

		const user = await User.findOne({ email })

		if (!user) {
			logger.error("User not found")
			return res.status(404).json({ success: false, message: "Invalid email or password" })
		}

		if (!user.isVerified) {
			logger.error("Account not verified")
			return res
				.status(400)
				.json({ success: false, message: "Account not verified" })
		}

		const isPasswordValid = await argon2.verify(user.password, password)

		if (!isPasswordValid) {
			logger.error("Invalid password")
			return res
				.status(401)
				.json({ success: false, message: "Invalid email or password" })
		}

		await generateTokens(res, user as UserType)
		logger.info("User logged in successfully", { userId: user._id })

		return res.status(200).json({
			success: true,
			message: "User logged in successfully",
			user: {
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
			},
		})
	} catch (err) {
		logger.error("Error logging in user", err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : "Internal server error",
		})
	}
}
