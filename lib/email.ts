import { contactEmail, SITE_NAME } from "@/lib/config";

export const RESEND_MISSING_MESSAGE =
  "Email is not configured. Set RESEND_API_KEY (Resend) to send login links.";

export const RESEND_SEND_FAILED_MESSAGE =
  "Could not send email. Check RESEND_API_KEY and that the from address is verified in Resend.";

export function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

export function loginFromAddress() {
  return `${SITE_NAME} <${contactEmail()}>`;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const key = resendApiKey();
  if (!key) {
    throw new Error(RESEND_MISSING_MESSAGE);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: loginFromAddress(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("resend failed", response.status, body);
    throw new Error(RESEND_SEND_FAILED_MESSAGE);
  }
}
