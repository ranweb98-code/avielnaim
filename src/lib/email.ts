import { Resend } from "resend";
import { getSetting } from "@/lib/settings";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Barber Noir <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("\n========== EMAIL PREVIEW ==========");
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log("--- HTML ---");
    console.log(payload.html);
    console.log("===================================\n");
    return true;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    console.error("Email send error:", error);
    return false;
  }

  return true;
}

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#100D0B; color:#F5F0E8; padding:24px; direction:rtl;">
  <div style="max-width:560px; margin:0 auto; background:#1A1512; border:1px solid #B87333; border-radius:12px; padding:24px;">
    ${content}
  </div>
</body>
</html>`;
}

export async function sendOwnerNewAppointmentEmail(data: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceName: string;
  date: string;
  time: string;
  notes?: string | null;
  inspoImages: { label: string; src: string }[];
}) {
  const ownerEmail =
    process.env.OWNER_EMAIL ?? (await getSetting("ownerEmail", "owner@example.com"));
  const businessName = await getSetting("businessName", "Barber Noir");

  const inspoHtml =
    data.inspoImages.length > 0
      ? `<p><strong>תמונות השראה:</strong></p><ul>${data.inspoImages
          .map(
            (img) =>
              `<li><a href="${img.src}" style="color:#345570">${img.label}</a></li>`
          )
          .join("")}</ul>`
      : "<p>לא נבחרו תמונות השראה</p>";

  const html = emailLayout(`
    <h2 style="color:#345570; margin-top:0;">תור חדש נקבע — ${businessName}</h2>
    <p><strong>שירות:</strong> ${data.serviceName}</p>
    <p><strong>תאריך:</strong> ${data.date}</p>
    <p><strong>שעה:</strong> ${data.time}</p>
    <hr style="border-color:#333;">
    <p><strong>שם:</strong> ${data.customerName}</p>
    <p><strong>טלפון:</strong> ${data.customerPhone}</p>
    <p><strong>אימייל:</strong> ${data.customerEmail}</p>
    ${data.notes ? `<p><strong>הערות:</strong> ${data.notes}</p>` : ""}
    ${inspoHtml}
  `);

  return sendEmail({
    to: ownerEmail,
    subject: `תור חדש — ${data.customerName} | ${businessName}`,
    html,
  });
}

export async function sendCustomerConfirmationEmail(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
}) {
  const businessName = await getSetting("businessName", "Barber Noir");
  const phone = await getSetting("businessPhone", "");
  const address = await getSetting("businessAddress", "");

  let statusText = "ממתין לאישור";
  if (data.status === "confirmed") statusText = "מאושר";
  if (data.status === "cancelled") statusText = "בוטל";

  const html = emailLayout(`
    <h2 style="color:#345570; margin-top:0;">שלום ${data.customerName},</h2>
    <p>התור שלך ב-${businessName} ${data.status === "pending" ? "נקלט בהצלחה" : "עודכן"}.</p>
    <p><strong>סטטוס:</strong> ${statusText}</p>
    <p><strong>שירות:</strong> ${data.serviceName}</p>
    <p><strong>תאריך:</strong> ${data.date}</p>
    <p><strong>שעה:</strong> ${data.time}</p>
    ${phone ? `<p><strong>טלפון:</strong> ${phone}</p>` : ""}
    ${address ? `<p><strong>כתובת:</strong> ${address}</p>` : ""}
    <p style="color:#999; font-size:14px;">נשלחת תזכורת לפני התור.</p>
  `);

  return sendEmail({
    to: data.customerEmail,
    subject: `אישור תור — ${businessName}`,
    html,
  });
}

export async function sendReminderEmail(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  date: string;
  time: string;
  hoursBefore: number;
}) {
  const businessName = await getSetting("businessName", "Barber Noir");
  const phone = await getSetting("businessPhone", "");
  const address = await getSetting("businessAddress", "");

  const html = emailLayout(`
    <h2 style="color:#345570; margin-top:0;">תזכורת לתור — ${businessName}</h2>
    <p>שלום ${data.customerName},</p>
    <p>מזכירים שהתור שלך בעוד ${data.hoursBefore} שעות:</p>
    <p><strong>שירות:</strong> ${data.serviceName}</p>
    <p><strong>תאריך:</strong> ${data.date}</p>
    <p><strong>שעה:</strong> ${data.time}</p>
    ${phone ? `<p><strong>טלפון:</strong> ${phone}</p>` : ""}
    ${address ? `<p><strong>כתובת:</strong> ${address}</p>` : ""}
    <p>נתראה!</p>
  `);

  return sendEmail({
    to: data.customerEmail,
    subject: `תזכורת: התור שלך מחר — ${businessName}`,
    html,
  });
}
