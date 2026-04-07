export interface MailTmMessage {
  id: string;
  from: { address: string; name: string };
  subject: string;
  text?: string;
  html?: string[];
  intro: string;
  createdAt: string;
}
