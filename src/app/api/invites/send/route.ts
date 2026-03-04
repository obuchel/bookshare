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
      from: `"КнигоОбмін / BookShare" <${process.env.GMAIL_USER}>`,
      to: to_email,
      subject: `${from_name} запрошує вас до КнигоОбміну 📚 / invites you to BookShare 📚`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; background: #fdf8f0; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <div style="background: #1a1a1a; padding: 24px 32px; text-align: center;">
            <span style="font-size: 28px;">📚</span>
            <h1 style="color: #d4a017; font-size: 22px; margin: 8px 0 0;">КнигоОбмін · BookShare</h1>
          </div>

          <!-- Body -->
          <div style="padding: 32px;">

            <!-- Ukrainian -->
            <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
              <strong>${from_name}</strong> запрошує вас приєднатися до <strong>КнигоОбміну</strong> —
              спільноти для позики та обміну книгами з людьми поруч.
            </p>

            <!-- English -->
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 32px; border-left: 3px solid #e5e0d8; padding-left: 12px;">
              <strong>${from_name}</strong> has invited you to join <strong>BookShare</strong> —
              a community platform for lending and borrowing books with people nearby.
            </p>

            <!-- CTA -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${invite_link}"
                 style="background: #1a1a1a; color: #d4a017; padding: 14px 36px;
                        border-radius: 8px; text-decoration: none; font-weight: bold;
                        font-size: 16px; display: inline-block; letter-spacing: 0.5px;">
                Приєднатися · Join →
              </a>
            </div>

            <!-- Fallback link -->
            <p style="color: #999; font-size: 12px; text-align: center; word-break: break-all;">
              Або скопіюйте посилання · Or copy this link:<br/>
              <a href="${invite_link}" style="color: #d4a017;">${invite_link}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f5ede0; padding: 16px 32px; border-top: 1px solid #e5e0d8;">
            <p style="color: #aaa; font-size: 11px; text-align: center; margin: 0;">
              КнигоОбмін · BookShare — Позичайте та діліться книгами / Lend &amp; borrow books in your community
            </p>
          </div>

        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
