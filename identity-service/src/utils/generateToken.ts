import { Types } from "mongoose"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { Response } from "express"
import { UserType } from "../types/types"
import { RefreshToken } from "../models/RefreshToken"

export const generateTokens = async (res: Response, user: UserType) => {
	const userName = user.lastName
		? user.firstName + user.lastName
		: user.firstName

	const accessToken = jwt.sign(
		{
			userId: user._id.toString(), // Convert ObjectId to string
			username: userName,
			email: user.email,
			role: user.role,
		},
		process.env.JWT_SECRET as string,
		{ expiresIn: "15m" }
	)

	const refreshToken = crypto.randomBytes(40).toString("hex")
	const expiresAt = new Date()
	expiresAt.setDate(expiresAt.getDate() + 18) // 18 days

	await RefreshToken.create({
		token: refreshToken,
		user: user._id, // keep ObjectId for DB
		expiresAt,
	})

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
		expires: expiresAt,
	})

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
		expires: new Date(Date.now() + 15 * 60 * 1000),
	})

	return { accessToken, refreshToken }
}

export const generateVerificationToken = async (
	res: Response,
	userId: Types.ObjectId,
	email: string
) => {
	const verificationToken = jwt.sign(
		{ userId: userId.toString(), email }, // <-- convert to string
		process.env.JWT_SECRET as string,
		{ expiresIn: "3m" }
	)

	res.cookie("verificationToken", verificationToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
		expires: new Date(Date.now() + 180000), // 3 minutes
	})

	return verificationToken
}

export const generateResetPasswordToken = async (
	res: Response,
	user: UserType
) => {
	const userName = user.lastName
		? user.firstName + user.lastName
		: user.firstName
	const resetPasswordToken = jwt.sign(
		{
			userId: user._id.toString(), // <-- convert ObjectId to string
			username: userName,
			email: user.email,
		},
		process.env.JWT_SECRET as string,
		{ expiresIn: "5m" }
	)
	const expiresAt = new Date()
	expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes from now

	res.cookie("resetPasswordToken", resetPasswordToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
		expires: new Date(Date.now() + 600000), // 10 minutes from now
	})

	return resetPasswordToken
}
