import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { to_email, from_name, invite_link } = await req.json();

    if (!to_email || !invite_link) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"BookShare" <${process.env.GMAIL_USER}>`,
      to: to_email,
      subject: `${from_name} invites you to BookShare 📚`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #fdf8f0; border-radius: 12px;">
          <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 8px;">You're invited to BookShare 📚</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            <strong>${from_name}</strong> has invited you to join <strong>BookShare</strong> — 
            a community platform for lending and borrowing books with people nearby.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${invite_link}" 
               style="background: #1a1a1a; color: #d4a017; padding: 14px 32px; 
                      border-radius: 8px; text-decoration: none; font-weight: bold; 
                      font-size: 16px; display: inline-block;">
              Join BookShare →
            </a>
          </div>
          <p style="color: #999; font-size: 13px;">
            Or copy this link: <a href="${invite_link}" style="color: #d4a017;">${invite_link}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e0d8; margin: 24px 0;" />
          <p style="color: #bbb; font-size: 12px; text-align: center;">
            BookShare — Lend & borrow books in your community
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
