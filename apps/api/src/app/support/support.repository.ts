import { Injectable } from '@nestjs/common';
import {
  ContactDeliveryStatus,
  ContactReason as DbContactReason,
  ContactSubmission,
  Prisma,
  Session,
  User,
} from '@prisma/client';
import { ContactReason } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordContactSubmissionParams {
  reason: ContactReason;
  email: string;
  userId: string | null;
  subject: string | null;
  area: string | null;
  location: string | null;
  message: string;
  context: Prisma.InputJsonValue | null;
  sessionId: string | null;
  hasScreenshot: boolean;
}

export interface ContactDeliveryOutcome {
  supportStatus: ContactDeliveryStatus;
  acknowledgementStatus: ContactDeliveryStatus;
}

@Injectable()
export class SupportRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUser(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  findOwnedSession(sessionId: string, userId: string): Promise<Session | null> {
    return this.prisma.session.findFirst({ where: { id: sessionId, userId } });
  }

  record(params: RecordContactSubmissionParams): Promise<ContactSubmission> {
    return this.prisma.contactSubmission.create({
      data: {
        ...params,
        reason: mapEnumValue(DbContactReason, params.reason),
        context: params.context ?? Prisma.JsonNull,
      },
    });
  }

  async markDelivery(
    submissionId: string,
    outcome: ContactDeliveryOutcome,
  ): Promise<void> {
    await this.prisma.contactSubmission.update({
      where: { id: submissionId },
      data: outcome,
    });
  }
}
