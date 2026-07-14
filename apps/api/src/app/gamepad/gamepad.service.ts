import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AxisType,
  GamepadPairingDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { GamepadPairingService } from './gamepad-pairing.service';
import { GamepadRepository } from './gamepad.repository';

@Injectable()
export class GamepadService {
  constructor(
    private readonly repository: GamepadRepository,
    private readonly pairingService: GamepadPairingService,
  ) {}

  async createPairing(
    userId: string,
    sessionId: string,
  ): Promise<GamepadPairingDto> {
    const session = await this.repository.findUserSession(sessionId, userId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (
      mapEnumValue(SessionStatus, session.status) !== SessionStatus.IN_PROGRESS
    ) {
      throw new ConflictException('Session is not in progress');
    }
    const mode = mapEnumValue(SessionMode, session.mode);
    const orderedAxes = [...session.axisResults].sort(
      (a, b) => a.order - b.order,
    );
    const currentAxis = orderedAxes[session.currentAxisIndex];
    const isMotricitySession =
      mode === SessionMode.TARGETED
        ? session.axisResults.some(
            (result) =>
              mapEnumValue(AxisType, result.axis) === AxisType.MOTOR_SKILLS,
          )
        : mode === SessionMode.FULL &&
          currentAxis !== undefined &&
          mapEnumValue(AxisType, currentAxis.axis) === AxisType.MOTOR_SKILLS;
    if (!isMotricitySession) {
      throw new BadRequestException(
        'Gamepad pairing requires an in-progress motricity session',
      );
    }
    const record = this.pairingService.create(userId, sessionId);
    return {
      token: record.token,
      code: record.code,
      expiresAt: new Date(record.expiresAt).toISOString(),
    };
  }

  createTutorialPairing(userId: string): GamepadPairingDto {
    const record = this.pairingService.create(userId, `tutoriel:${userId}`);
    return {
      token: record.token,
      code: record.code,
      expiresAt: new Date(record.expiresAt).toISOString(),
    };
  }
}
