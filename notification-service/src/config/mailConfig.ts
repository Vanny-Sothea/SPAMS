import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	auth: {
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_PASS,
	},
})

export const sender = {
    name : 'KSMS',
    address : process.env.MAIL_AUTH_USER as string,
}
