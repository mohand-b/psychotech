import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { GamepadPairingDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { GamepadService } from './gamepad.service';

@Controller('sessions/:sessionId/gamepad')
export class GamepadController {
  constructor(private readonly gamepadService: GamepadService) {}

  @Post('pairing')
  createPairing(
    @CurrentUser() userId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<GamepadPairingDto> {
    return this.gamepadService.createPairing(userId, sessionId);
  }
}

@Controller('gamepad/tutoriel')
export class GamepadTutorialController {
  constructor(private readonly gamepadService: GamepadService) {}

  @Post('pairing')
  createTutorialPairing(@CurrentUser() userId: string): GamepadPairingDto {
    return this.gamepadService.createTutorialPairing(userId);
  }
}
