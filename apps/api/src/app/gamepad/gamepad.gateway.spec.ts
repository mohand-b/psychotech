import { GamepadSignalMessage } from '@psychotech/shared';
import { GamepadPairingService } from './gamepad-pairing.service';
import { GamepadGateway, GamepadSocket } from './gamepad.gateway';

const SOCKET_OPEN = 1;
const SOCKET_CLOSED = 3;

interface FakeSocket extends GamepadSocket {
  sent: GamepadSignalMessage[];
  closed: boolean;
}

function createSocket(): FakeSocket {
  const socket: FakeSocket = {
    readyState: SOCKET_OPEN,
    sent: [],
    closed: false,
    send(data: string) {
      socket.sent.push(JSON.parse(data) as GamepadSignalMessage);
    },
    close() {
      socket.closed = true;
      socket.readyState = SOCKET_CLOSED;
    },
    on() {
      return;
    },
  };
  return socket;
}

describe('GamepadGateway', () => {
  let pairing: GamepadPairingService;
  let gateway: GamepadGateway;
  let token: string;

  beforeEach(() => {
    pairing = new GamepadPairingService();
    gateway = new GamepadGateway(pairing);
    token = pairing.create('user-1', 'session-1').token;
  });

  function join(socket: GamepadSocket, role: 'DESKTOP' | 'PHONE', joinToken = token): void {
    gateway.handleMessage(socket, JSON.stringify({ type: 'join', role, token: joinToken }));
  }

  it('acknowledges the join and notifies the peer already in the room', () => {
    const desktop = createSocket();
    const phone = createSocket();
    join(desktop, 'DESKTOP');
    expect(desktop.sent).toEqual([
      { type: 'joined', role: 'DESKTOP', peerPresent: false },
    ]);
    join(phone, 'PHONE');
    expect(phone.sent).toEqual([
      { type: 'joined', role: 'PHONE', peerPresent: true },
    ]);
    expect(desktop.sent).toContainEqual({ type: 'peer-joined', role: 'PHONE' });
  });

  it('rejects a join with an invalid token and closes the socket', () => {
    const phone = createSocket();
    join(phone, 'PHONE', 'unknown');
    expect(phone.sent).toEqual([{ type: 'error', code: 'INVALID_TOKEN' }]);
    expect(phone.closed).toBe(true);
  });

  it('rejects a second phone while the first is connected', () => {
    const desktop = createSocket();
    const firstPhone = createSocket();
    const secondPhone = createSocket();
    join(desktop, 'DESKTOP');
    join(firstPhone, 'PHONE');
    join(secondPhone, 'PHONE');
    expect(secondPhone.sent).toEqual([{ type: 'error', code: 'ROOM_FULL' }]);
    expect(secondPhone.closed).toBe(true);
  });

  it('accepts a phone reconnection after the first socket left', () => {
    const desktop = createSocket();
    const firstPhone = createSocket();
    join(desktop, 'DESKTOP');
    join(firstPhone, 'PHONE');
    gateway.handleDisconnect(firstPhone);
    expect(desktop.sent).toContainEqual({ type: 'peer-left', role: 'PHONE' });
    const secondPhone = createSocket();
    join(secondPhone, 'PHONE');
    expect(secondPhone.sent).toEqual([
      { type: 'joined', role: 'PHONE', peerPresent: true },
    ]);
  });

  it('routes signaling and relay messages to the other peer of the same room', () => {
    const desktop = createSocket();
    const phone = createSocket();
    const otherDesktop = createSocket();
    const otherToken = pairing.create('user-2', 'session-2').token;
    join(desktop, 'DESKTOP');
    join(phone, 'PHONE');
    join(otherDesktop, 'DESKTOP', otherToken);
    gateway.handleMessage(desktop, JSON.stringify({ type: 'offer', sdp: 'sdp-offer' }));
    expect(phone.sent).toContainEqual({ type: 'offer', sdp: 'sdp-offer' });
    gateway.handleMessage(
      phone,
      JSON.stringify({
        type: 'relay',
        payload: { kind: 'input', seq: 1, t: 16, x: 0.5, y: -0.25 },
      }),
    );
    expect(desktop.sent).toContainEqual({
      type: 'relay',
      payload: { kind: 'input', seq: 1, t: 16, x: 0.5, y: -0.25 },
    });
    expect(otherDesktop.sent).toEqual([
      { type: 'joined', role: 'DESKTOP', peerPresent: false },
    ]);
  });

  it('ignores malformed payloads and messages from sockets outside a room', () => {
    const stranger = createSocket();
    gateway.handleMessage(stranger, 'not-json');
    gateway.handleMessage(stranger, JSON.stringify({ type: 'offer', sdp: 'x' }));
    expect(stranger.sent).toEqual([]);
  });
});
