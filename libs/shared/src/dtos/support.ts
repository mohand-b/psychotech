import {
  ContactProblemLocation,
  ContactReason,
  ContactSuggestionArea,
} from '../enums/contact-reason';

export type ContactScreenshotMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

export interface ContactTechnicalContextDto {
  pageUrl: string;
  userAgent: string;
  viewport: string;
}

export interface ContactScreenshotDto {
  mimeType: ContactScreenshotMimeType;
  dataBase64: string;
}

export interface ContactFormTokenDto {
  token: string;
}

export interface SubmitContactDto {
  reason: ContactReason;
  email?: string;
  subject?: string;
  area?: ContactSuggestionArea;
  location?: ContactProblemLocation;
  message: string;
  formToken: string;
  website?: string;
  technicalContext?: ContactTechnicalContextDto;
  sessionId?: string;
  screenshot?: ContactScreenshotDto;
}

export interface ContactReceiptDto {
  reference: string;
  email: string;
}
