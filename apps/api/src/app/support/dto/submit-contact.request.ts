import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_PAGE_URL_MAX_LENGTH,
  CONTACT_SCREENSHOT_MAX_BYTES,
  CONTACT_SCREENSHOT_MIME_TYPES,
  CONTACT_SUBJECT_MAX_LENGTH,
  CONTACT_USER_AGENT_MAX_LENGTH,
  CONTACT_VIEWPORT_PATTERN,
  ContactProblemLocation,
  ContactReason,
  ContactScreenshotDto,
  ContactScreenshotMimeType,
  ContactSuggestionArea,
  ContactTechnicalContextDto,
  SubmitContactDto,
} from '@psychotech/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBase64,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const BASE64_EXPANSION_RATIO = 4 / 3;
const SCREENSHOT_BASE64_MAX_LENGTH = Math.ceil(
  CONTACT_SCREENSHOT_MAX_BYTES * BASE64_EXPANSION_RATIO,
);
const HONEYPOT_MAX_LENGTH = 200;
const FORM_TOKEN_MAX_LENGTH = 200;

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimmedLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

class ContactTechnicalContextRequest implements ContactTechnicalContextDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTACT_PAGE_URL_MAX_LENGTH)
  pageUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTACT_USER_AGENT_MAX_LENGTH)
  userAgent!: string;

  @Matches(CONTACT_VIEWPORT_PATTERN)
  viewport!: string;
}

class ContactScreenshotRequest implements ContactScreenshotDto {
  @IsIn(CONTACT_SCREENSHOT_MIME_TYPES)
  mimeType!: ContactScreenshotMimeType;

  @IsBase64()
  @MaxLength(SCREENSHOT_BASE64_MAX_LENGTH)
  dataBase64!: string;
}

export class SubmitContactRequest implements SubmitContactDto {
  @IsEnum(ContactReason)
  reason!: ContactReason;

  @IsOptional()
  @Transform(trimmedLowercase)
  @IsEmail()
  @MaxLength(CONTACT_EMAIL_MAX_LENGTH)
  email?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(CONTACT_SUBJECT_MAX_LENGTH)
  subject?: string;

  @IsOptional()
  @IsEnum(ContactSuggestionArea)
  area?: ContactSuggestionArea;

  @IsOptional()
  @IsEnum(ContactProblemLocation)
  location?: ContactProblemLocation;

  @Transform(trimmed)
  @IsString()
  @MinLength(CONTACT_MESSAGE_MIN_LENGTH)
  @MaxLength(CONTACT_MESSAGE_MAX_LENGTH)
  message!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(FORM_TOKEN_MAX_LENGTH)
  formToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(HONEYPOT_MAX_LENGTH)
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactTechnicalContextRequest)
  technicalContext?: ContactTechnicalContextRequest;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactScreenshotRequest)
  screenshot?: ContactScreenshotRequest;
}
