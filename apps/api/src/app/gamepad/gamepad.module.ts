import { Module } from '@nestjs/common';
import {
  GamepadController,
  GamepadTutorialController,
} from './gamepad.controller';
import { GamepadGateway } from './gamepad.gateway';
import { GamepadPairingService } from './gamepad-pairing.service';
import { GamepadRepository } from './gamepad.repository';
import { GamepadService } from './gamepad.service';

@Module({
  controllers: [GamepadController, GamepadTutorialController],
  providers: [
    GamepadService,
    GamepadPairingService,
    GamepadRepository,
    GamepadGateway,
  ],
})
export class GamepadModule {}
