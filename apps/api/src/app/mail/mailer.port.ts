export interface MailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface MailerPort {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');
