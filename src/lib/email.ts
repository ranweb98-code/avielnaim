import { Resend } from "resend";
import {
  createApproveToken,
  createCancelToken,
  getApproveUrl,
  getCancelUrl,
} from "@/lib/cancel-token";
import { getSetting } from "@/lib/settings";
import { BUSINESS_NAME } from "@/lib/utils";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const BRAND = {
  bg: "#f3f4f6",
  card: "#ffffff",
  cardInner: "#f9fafb",
  cardBorder: "rgba(0, 0, 0, 0.08)",
  gold: "#c99700",
  text: "#111827",
  textMuted: "#6b7280",
  textDim: "#9ca3af",
  danger: "#dc2626",
  dangerHover: "#b91c1c",
  success: "#16a34a",
  successHover: "#15803d",
};

const BRAND_FONT =
  "'Kaushan Script', 'Segoe Script', 'Brush Script MT', cursive";
const BODY_FONT = "Heebo, Arial, sans-serif";

async function getOwnerEmail(): Promise<string> {
  const fromSetting = (await getSetting("ownerEmail", "")).trim();
  const fromEnv = (process.env.OWNER_EMAIL ?? "").trim();
  return fromSetting || fromEnv;
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
  const { data, error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    console.error("Email send error:", error);
    if (
      error.message?.includes("testing emails") ||
      error.message?.includes("verify a domain")
    ) {
      console.error(
        "\n[Resend] בלי דומיין מאומת אפשר לשלוח רק לכתובת חשבון Resend שלך.",
        "הוסף דומיין ב-resend.com/domains או עדכן את ownerEmail לכתובת הרשומה ב-Resend.\n"
      );
    }
    return false;
  }

  if (data?.id) {
    console.log(`Email sent to ${payload.to} (id: ${data.id})`);
  }

  return true;
}

function emailHeader(businessName: string): string {
  return `
    <tr>
      <td align="center" style="padding:0 0 24px;">
        <p style="margin:0;font-size:32px;font-weight:400;color:${BRAND.gold};letter-spacing:0.02em;font-family:${BRAND_FONT};transform:skewX(-6deg);">
          ${businessName}
        </p>
        <div style="width:48px;height:3px;background:${BRAND.gold};margin:12px auto 0;border-radius:2px;"></div>
      </td>
    </tr>`;
}

function emailFooter(businessName: string): string {
  return `
    <tr>
      <td align="center" style="padding:24px 0 0;">
        <p style="margin:0;font-size:12px;color:${BRAND.textDim};font-family:${BODY_FONT};">
          ${businessName} · קביעת תורים אונליין
        </p>
      </td>
    </tr>`;
}

function appointmentCard(fields: { label: string; value: string }[]): string {
  const rows = fields
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.cardBorder};">
          <p style="margin:0 0 4px;font-size:12px;color:${BRAND.textMuted};font-family:${BODY_FONT};">${f.label}</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:${BRAND.text};font-family:${BODY_FONT};">${f.value}</p>
        </td>
      </tr>`
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
      style="background:${BRAND.cardInner};border-radius:12px;border:1px solid ${BRAND.cardBorder};margin:20px 0;">
      <tr><td style="padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>
      </td></tr>
    </table>`;
}

function emailLayout(options: {
  businessName?: string;
  heading: string;
  greeting?: string;
  body?: string;
  card?: string;
  action?: string;
}): string {
  const businessName = options.businessName ?? BUSINESS_NAME;
  const greeting = options.greeting
    ? `<p style="margin:0 0 8px;font-size:16px;color:${BRAND.textMuted};font-family:${BODY_FONT};">${options.greeting}</p>`
    : "";
  const body = options.body
    ? `<p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:${BRAND.textMuted};font-family:${BODY_FONT};">${options.body}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.heading}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&family=Kaushan+Script&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${BRAND.bg};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:560px;">
        ${emailHeader(businessName)}
        <tr>
          <td style="background:${BRAND.card};border:1px solid ${BRAND.cardBorder};border-radius:16px;padding:32px 28px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.text};font-family:${BODY_FONT};">
              ${options.heading}
            </h1>
            ${greeting}
            ${body}
            ${options.card ?? ""}
            ${options.action ?? ""}
          </td>
        </tr>
        ${emailFooter(businessName)}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function approveButtonHtml(approveUrl: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
      <tr><td align="center">
        <a href="${approveUrl}"
          style="display:inline-block;padding:14px 32px;background:${BRAND.success};color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;font-family:${BODY_FONT};">
          אישור התור
        </a>
      </td></tr>
      <tr><td align="center" style="padding-top:12px;">
        <p style="margin:0;font-size:12px;color:${BRAND.textDim};font-family:${BODY_FONT};">
          לחץ לאישור התור — הלקוח יקבל עדכון
        </p>
      </td></tr>
    </table>`;
}

function cancelButtonHtml(cancelUrl: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
      <tr><td align="center">
        <a href="${cancelUrl}"
          style="display:inline-block;padding:14px 32px;background:${BRAND.danger};color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;font-family:${BODY_FONT};">
          ביטול התור
        </a>
      </td></tr>
      <tr><td align="center" style="padding-top:12px;">
        <p style="margin:0;font-size:12px;color:${BRAND.textDim};font-family:${BODY_FONT};">
          לחץ כאן רק אם ברצונך לבטל את התור
        </p>
      </td></tr>
    </table>`;
}

async function businessDetailsCard(): Promise<string> {
  const businessName =
    (await getSetting("businessName", BUSINESS_NAME)) || BUSINESS_NAME;
  const phone = await getSetting("businessPhone", "");
  const address = await getSetting("businessAddress", "");

  const fields: { label: string; value: string }[] = [
    { label: "שם העסק", value: businessName },
  ];
  if (phone) fields.push({ label: "טלפון", value: phone });
  if (address) fields.push({ label: "כתובת", value: address });

  return `
    <p style="margin:24px 0 8px;font-size:13px;font-weight:600;color:${BRAND.gold};font-family:${BODY_FONT};text-transform:uppercase;letter-spacing:0.5px;">
      פרטי העסק
    </p>
    ${appointmentCard(fields)}`;
}

/** Preview / test helper */
export function buildCustomerSelfBookingPreviewHtml(data: {
  customerName: string;
  date: string;
  time: string;
  cancelUrl?: string;
}): string {
  const card = appointmentCard([
    { label: "תאריך", value: data.date },
    { label: "שעה", value: data.time },
    { label: "סטטוס", value: "ממתין לאישור" },
  ]);

  return emailLayout({
    heading: "התור שלך נקבע בהצלחה ✓",
    greeting: `שלום ${data.customerName},`,
    body: "שמחים לאשר שהתור שלך נקלט. להלן הפרטים:",
    card,
    action: data.cancelUrl ? cancelButtonHtml(data.cancelUrl) : "",
  });
}

/** Scenario 1 — owner notification when customer books */
export async function sendOwnerNewAppointmentEmail(data: {
  appointmentId: number;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  const ownerEmail = await getOwnerEmail();
  if (!ownerEmail) {
    console.warn(
      "[Email] ownerEmail לא מוגדר — דלג על התראת בעלים. הגדר בהגדרות מנהל או OWNER_EMAIL."
    );
    return true;
  }

  const businessName =
    (await getSetting("businessName", BUSINESS_NAME)) || BUSINESS_NAME;
  const approveToken = await createApproveToken(data.appointmentId);
  const approveUrl = getApproveUrl(approveToken);

  const card = appointmentCard([
    { label: "שם הלקוח", value: data.customerName },
    { label: "טלפון", value: data.customerPhone },
    { label: "שירות", value: data.serviceName },
    { label: "תאריך", value: data.date },
    { label: "שעה", value: data.time },
    { label: "סטטוס", value: "ממתין לאישור" },
  ]);

  const html = emailLayout({
    businessName,
    heading: "תור חדש ממתין לאישור",
    body: "לקוח קבע תור דרך האתר. לאשר את התור:",
    card,
    action: approveButtonHtml(approveUrl),
  });

  return sendEmail({
    to: ownerEmail,
    subject: `תור חדש ממתין לאישור — ${data.customerName}`,
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
  const details = await businessDetailsCard();

  const card = appointmentCard([
    { label: "תאריך", value: data.date },
    { label: "שעה", value: data.time },
    { label: "סטטוס", value: "ממתין לאישור" },
  ]);

  const html = emailLayout({
    heading: "התור שלך נקבע בהצלחה ✓",
    greeting: `שלום ${data.customerName},`,
    body: "שמחים לאשר שהתור שלך נקלט. להלן הפרטים:",
    card: card + details,
    action: cancelButtonHtml(cancelUrl),
  });

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
  const details = await businessDetailsCard();

  const card = appointmentCard([
    { label: "תאריך", value: data.date },
    { label: "שעה", value: data.time },
    { label: "סטטוס", value: "מאושר" },
  ]);

  const html = emailLayout({
    heading: "נקבע עבורך תור",
    greeting: `שלום ${data.customerName},`,
    body: "נקבע עבורך תור. להלן הפרטים:",
    card: card + details,
    action: cancelButtonHtml(cancelUrl),
  });

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

  let statusText = "ממתין לאישור";
  if (data.status === "confirmed") statusText = "מאושר";
  if (data.status === "cancelled") statusText = "בוטל";

  const card = appointmentCard([
    { label: "שירות", value: data.serviceName },
    { label: "תאריך", value: data.date },
    { label: "שעה", value: data.time },
    { label: "סטטוס", value: statusText },
  ]);

  const html = emailLayout({
    businessName,
    heading: data.status === "cancelled" ? "התור בוטל" : "עדכון תור",
    greeting: `שלום ${data.customerName},`,
    body:
      data.status === "pending"
        ? "התור שלך נקלט בהצלחה."
        : "התור שלך עודכן.",
    card,
  });

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

  const card = appointmentCard([
    { label: "שירות", value: data.serviceName },
    { label: "תאריך", value: data.date },
    { label: "שעה", value: data.time },
    ...(phone ? [{ label: "טלפון", value: phone }] : []),
    ...(address ? [{ label: "כתובת", value: address }] : []),
  ]);

  const html = emailLayout({
    businessName,
    heading: "תזכורת לתור",
    greeting: `שלום ${data.customerName},`,
    body: `מזכירים שהתור שלך בעוד ${data.hoursBefore} שעות:`,
    card,
    action: `<p style="margin:20px 0 0;font-size:15px;color:${BRAND.text};font-family:${BODY_FONT};text-align:center;">נתראה! 💈</p>`,
  });

  return sendEmail({
    to: data.customerEmail,
    subject: `תזכורת: התור שלך — ${businessName}`,
    html,
  });
}

/** Send a test email preview to verify Resend + template */
export async function sendTestCustomerEmail(to: string): Promise<boolean> {
  const html = buildCustomerSelfBookingPreviewHtml({
    customerName: "לקוח לדוגמה",
    date: "יום ראשון, 29 ביוני 2026",
    time: "14:30",
    cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://avielnaim.vercel.app"}/cancel?token=test`,
  });

  return sendEmail({
    to,
    subject: `[בדיקה] התור שלך נקבע — ${BUSINESS_NAME}`,
    html,
  });
}
