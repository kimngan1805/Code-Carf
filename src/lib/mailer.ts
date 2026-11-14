import { logger } from "@/lib/logger";

export interface Email {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Email delivery. The console adapter only logs; add a Resend or Brevo adapter later. */
export interface Mailer {
  send(email: Email): Promise<void>;
}

const consoleMailer: Mailer = {
  async send(email) {
    logger.info("email (console mailer, not sent)", {
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
  },
};

export function getMailer(): Mailer {
  return consoleMailer;
}
