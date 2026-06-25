import { Resend } from "resend";
import { createCancelToken, getCancelUrl } from "@/lib/cancel-token";
import { getSetting } from "@/lib/settings";
import { BUSINESS_NAME } from "@/lib/utils";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function getOwnerEmail(): Promise<string> {
  const email =
    process.env.OWNER_EMAIL ?? (await getSetting("ownerEmail", ""));
  return email.trim();
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "Aviel Naim <onboarding@resend.dev>";

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

function cancelButtonHtml(cancelUrl: string): string {
  return `<p style="margin-top:24px;">
    <a href="${cancelUrl}" style="display:inline-block;padding:12px 24px;background:#ef4444;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;">
      Cancel Appointment
    </a>
  </p>`;
}

async function businessDetailsHtml(): Promise<string> {
  const businessName = BUSINESS_NAME;
  const phone = await getSetting("businessPhone", "");
  const address = await getSetting("businessAddress", "");
  return `
    <hr style="border-color:#333;margin:16px 0;">
    <p><strong>פרטי העסק:</strong></p>
    <p><strong>${businessName}</strong></p>
    ${phone ? `<p><strong>טלפון:</strong> ${phone}</p>` : ""}
    ${address ? `<p><strong>כתובת:</strong> ${address}</p>` : ""}
  `;
}

/** Scenario 1 — owner notification when customer books */
export async function sendOwnerNewAppointmentEmail(data: {
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
}) {
  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) return true;

  const html = emailLayout(`
    <h2 style="color:#345570; margin-top:0;">נקבע תור חדש</h2>
    <p><strong>שם הלקוח:</strong> ${data.customerName}</p>
    <p><strong>טלפון:</strong> ${data.customerPhone}</p>
    <p><strong>תאריך:</strong> ${data.date}</p>
    <p><strong>שעה:</strong> ${data.time}</p>
  `);

  return sendEmail({
    to: ownerEmail,
    subject: `נקבע תור חדש — ${data.customerName}`,
    html,
  });
}

/** Scenario 1 — customer confirmation when self-booking */
export async function sendCustomerSelfBookingEmail(data: {
  appointmentId: number;
  customerEmail: string;
  customerName: string;
  date: string;
  time: string;
}) {
  if (!data.customerEmail.trim()) return true;

  const token = await createCancelToken(data.appointmentId);
  const cancelUrl = getCancelUrl(token);
  const details = await businessDetailsHtml();

  const html = emailLayout(`
    <h2 style="color:#345570; margin-top:0;">התור שלך נקבע בהצלחה</h2>
    <p>שלום ${data.customerName},</p>
    <p><strong>תאריך:</strong> ${data.date}</p>
    <p><strong>שעה:</strong> ${data.time}</p>
    ${details}
    ${cancelButtonHtml(cancelUrl)}
  `);

  return sendEmail({
    to: data.customerEmail,
    subject: `התור שלך נקבע בהצלחה — ${BUSINESS_NAME}`,
    html,
  });
}

/** Scenario 2 — customer notification when admin creates appointment */
export async function sendCustomerAdminBookingEmail(data: {
  appointmentId: number;
  customerEmail: string;
  customerName: string;
  date: string;
  time: string;
}) {
  if (!data.customerEmail.trim()) return true;

  const token = await createCancelToken(data.appointmentId);
  const cancelUrl = getCancelUrl(token);

  const html = emailLayout(`
    <h2 style="color:#345570; margin-top:0;">נקבע עבורך תור</h2>
    <p>שלום ${data.customerName},</p>
    <p><strong>תאריך:</strong> ${data.date}</p>
    <p><strong>שעה:</strong> ${data.time}</p>
    ${cancelButtonHtml(cancelUrl)}
  `);

  return sendEmail({
    to: data.customerEmail,
    subject: `נקבע עבורך תור — ${BUSINESS_NAME}`,
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
  if (!data.customerEmail.trim()) return true;

  const businessName = BUSINESS_NAME;
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
  `);

  return sendEmail({
    to: data.customerEmail,
    subject: `עדכון תור — ${businessName}`,
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
  if (!data.customerEmail.trim()) return true;

  const businessName = BUSINESS_NAME;
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
    subject: `תזכורת: התור שלך — ${businessName}`,
    html,
  });
}
