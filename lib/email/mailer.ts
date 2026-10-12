import nodemailer from "nodemailer";
import { smtpConfig } from "./smtp-config.cjs";
import { validEmail } from "../project-form";

type Message = { subject: string; html: string; text: string };

export async function sendMail(message: Message & { to: string; replyTo?: string }) {
  if (!validEmail(message.to) || (message.replyTo && !validEmail(message.replyTo)) || /[\r\n]/.test(message.subject)) throw new Error("INVALID_MAIL");
  const transport = nodemailer.createTransport(smtpConfig());
  try {
    const result = await transport.sendMail({ ...message, from: process.env.MAIL_FROM });
    if (!result.accepted?.length || result.rejected?.length) throw new Error("MAIL_REJECTED");
  } finally {
    transport.close();
  }
}

export function contactRecipient() {
  // Configuration is checked again by the transport; never supplied by the browser.
  return process.env.MAIL_TO_CONTACT || "contacto@fulcrum.com.pe";
}
