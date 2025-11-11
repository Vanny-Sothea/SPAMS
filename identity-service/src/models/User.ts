import mongoose from "mongoose"

export enum Role {
	USER = "USER",
	ADMIN = "ADMIN",
}

const userSchema = new mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
		},
		lastName: {
			type: String,
			required: false,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: Object.values(Role),
			default: Role.USER,
		},

		isVerified: {
			type: Boolean,
			default: false,
		},
		twoFactorCode: {
			type: String,
			required: false,
		},
		twoFactorCodeExpiry: {
			type: Date,
			required: false,
		},
	},
	{
		timestamps: true,
	}
)

userSchema.index({ email: "text" })

export const User = mongoose.model("User", userSchema)
