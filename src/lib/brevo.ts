const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "GestãoProjetos", email: "no-reply@gestaoprojetos.app" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo error: ${err.message ?? res.status}`);
  }
}
