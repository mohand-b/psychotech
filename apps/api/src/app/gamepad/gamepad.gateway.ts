import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  GAMEPAD_SIGNALING_PATH,
  GamepadJoinMessage,
  GamepadPeerRole,
  GamepadSignalMessage,
} from '@psychotech/shared';
import { GamepadPairingService } from './gamepad-pairing.service';

const SOCKET_OPEN = 1;

export interface GamepadSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  on(event: 'message', listener: (data: unknown) => void): void;
}

interface GamepadRoom {
  desktop: GamepadSocket | null;
  phone: GamepadSocket | null;
}

interface GamepadMembership {
  token: string;
  role: GamepadPeerRole;
}

@WebSocketGateway({ path: GAMEPAD_SIGNALING_PATH })
export class GamepadGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly rooms = new Map<string, GamepadRoom>();
  private readonly memberships = new Map<GamepadSocket, GamepadMembership>();

  constructor(private readonly pairingService: GamepadPairingService) {}

  handleConnection(client: GamepadSocket): void {
    client.on('message', (data) => this.handleMessage(client, data));
  }

  handleDisconnect(client: GamepadSocket): void {
    this.leave(client);
  }

  handleMessage(client: GamepadSocket, data: unknown): void {
    const message = this.parseMessage(data);
    if (!message) {
      return;
    }
    if (message.type === 'join') {
      this.join(client, message);
      return;
    }
    if (
      message.type === 'offer' ||
      message.type === 'answer' ||
      message.type === 'ice' ||
      message.type === 'relay'
    ) {
      this.forwardToPeer(client, message);
    }
  }

  private join(client: GamepadSocket, message: GamepadJoinMessage): void {
    const claim =
      message.role === 'PHONE'
        ? this.pairingService.claimPhone(message.token)
        : this.pairingService.validateDesktop(message.token);
    if (claim.ok === false) {
      this.send(client, { type: 'error', code: claim.error });
      client.close();
      return;
    }
    const token = claim.record.token;
    const room = this.rooms.get(token) ?? { desktop: null, phone: null };
    if (message.role === 'PHONE' && this.isOpen(room.phone) && room.phone !== client) {
      this.send(client, { type: 'error', code: 'ROOM_FULL' });
      client.close();
      return;
    }
    const previous = message.role === 'PHONE' ? room.phone : room.desktop;
    if (previous && previous !== client) {
      this.memberships.delete(previous);
      previous.close();
    }
    if (message.role === 'PHONE') {
      room.phone = client;
    } else {
      room.desktop = client;
    }
    this.rooms.set(token, room);
    this.memberships.set(client, { token, role: message.role });
    const peer = this.peerOf(room, message.role);
    this.send(client, {
      type: 'joined',
      role: message.role,
      peerPresent: this.isOpen(peer),
    });
    if (peer && this.isOpen(peer)) {
      this.send(peer, { type: 'peer-joined', role: message.role });
    }
  }

  private leave(client: GamepadSocket): void {
    const membership = this.memberships.get(client);
    if (!membership) {
      return;
    }
    this.memberships.delete(client);
    const room = this.rooms.get(membership.token);
    if (!room) {
      return;
    }
    if (membership.role === 'PHONE' && room.phone === client) {
      room.phone = null;
    }
    if (membership.role === 'DESKTOP' && room.desktop === client) {
      room.desktop = null;
    }
    const peer = this.peerOf(room, membership.role);
    if (peer && this.isOpen(peer)) {
      this.send(peer, { type: 'peer-left', role: membership.role });
    }
    if (!room.desktop && !room.phone) {
      this.rooms.delete(membership.token);
    }
  }

  private forwardToPeer(client: GamepadSocket, message: GamepadSignalMessage): void {
    const membership = this.memberships.get(client);
    if (!membership) {
      return;
    }
    const room = this.rooms.get(membership.token);
    if (!room) {
      return;
    }
    const peer = this.peerOf(room, membership.role);
    if (peer && this.isOpen(peer)) {
      this.send(peer, message);
    }
  }

  private peerOf(room: GamepadRoom, role: GamepadPeerRole): GamepadSocket | null {
    return role === 'PHONE' ? room.desktop : room.phone;
  }

  private isOpen(socket: GamepadSocket | null): boolean {
    return socket !== null && socket.readyState === SOCKET_OPEN;
  }

  private send(socket: GamepadSocket, message: GamepadSignalMessage): void {
    socket.send(JSON.stringify(message));
  }

  private parseMessage(data: unknown): GamepadSignalMessage | null {
    try {
      const parsed = JSON.parse(String(data)) as GamepadSignalMessage;
      return typeof parsed === 'object' && parsed !== null && 'type' in parsed
        ? parsed
        : null;
    } catch {
      return null;
    }
  }
}
