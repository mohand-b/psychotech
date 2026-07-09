import {
  GAMEPAD_ICE_TIMEOUT_MS,
  GAMEPAD_STUN_SERVERS,
  GamepadChannelMessage,
  GamepadConnectionState,
  GamepadPeerRole,
  GamepadSignalErrorCode,
  GamepadSignalMessage,
  GamepadTransportMode,
} from '@psychotech/shared';

const DATA_CHANNEL_LABEL = 'gamepad-input';

export interface GamepadTransportOptions {
  url: string;
  token: string;
  role: GamepadPeerRole;
  forceRelay: boolean;
  onMessage: (message: GamepadChannelMessage) => void;
  onStateChange: (state: GamepadConnectionState) => void;
  onModeChange: (mode: GamepadTransportMode) => void;
  onError: (code: GamepadSignalErrorCode) => void;
}

export class GamepadTransport {
  private socket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private iceTimerId: number | null = null;
  private closed = false;
  private mode: GamepadTransportMode = 'RELAY';

  constructor(private readonly options: GamepadTransportOptions) {}

  connect(): void {
    this.closed = false;
    this.options.onStateChange(GamepadConnectionState.CONNECTING);
    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    socket.onopen = () => {
      this.sendSignal({
        type: 'join',
        role: this.options.role,
        token: this.options.token,
      });
    };
    socket.onmessage = (event) => {
      this.handleSignal(JSON.parse(String(event.data)) as GamepadSignalMessage);
    };
    socket.onclose = () => {
      if (!this.closed) {
        this.options.onStateChange(GamepadConnectionState.DISCONNECTED);
      }
    };
  }

  send(message: GamepadChannelMessage): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
      return;
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSignal({ type: 'relay', payload: message });
    }
  }

  close(): void {
    this.closed = true;
    this.clearIceTimer();
    this.teardownPeerConnection();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  private handleSignal(message: GamepadSignalMessage): void {
    switch (message.type) {
      case 'joined':
        if (message.peerPresent) {
          this.onPeerAvailable();
        } else {
          this.options.onStateChange(GamepadConnectionState.WAITING);
        }
        break;
      case 'peer-joined':
        this.onPeerAvailable();
        break;
      case 'peer-left':
        this.clearIceTimer();
        this.teardownPeerConnection();
        this.setMode('RELAY');
        this.options.onStateChange(GamepadConnectionState.DISCONNECTED);
        break;
      case 'offer':
        void this.acceptOffer(message.sdp);
        break;
      case 'answer':
        void this.peerConnection?.setRemoteDescription({
          type: 'answer',
          sdp: message.sdp,
        });
        break;
      case 'ice':
        void this.peerConnection?.addIceCandidate({
          candidate: message.candidate,
          sdpMid: message.sdpMid,
          sdpMLineIndex: message.sdpMLineIndex,
        });
        break;
      case 'relay':
        this.options.onMessage(message.payload);
        break;
      case 'error':
        this.closed = true;
        this.options.onError(message.code);
        break;
      case 'join':
        break;
    }
  }

  private onPeerAvailable(): void {
    this.options.onStateChange(GamepadConnectionState.CONNECTED);
    this.setMode('RELAY');
    if (this.options.forceRelay || typeof RTCPeerConnection === 'undefined') {
      return;
    }
    if (this.options.role === 'PHONE') {
      void this.startOffer();
    }
    this.armIceTimer();
  }

  private async startOffer(): Promise<void> {
    const peerConnection = this.createPeerConnection();
    const dataChannel = peerConnection.createDataChannel(DATA_CHANNEL_LABEL, {
      ordered: false,
      maxRetransmits: 0,
    });
    this.wireDataChannel(dataChannel);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    if (offer.sdp) {
      this.sendSignal({ type: 'offer', sdp: offer.sdp });
    }
  }

  private async acceptOffer(sdp: string): Promise<void> {
    if (this.options.forceRelay || typeof RTCPeerConnection === 'undefined') {
      return;
    }
    const peerConnection = this.createPeerConnection();
    peerConnection.ondatachannel = (event) => this.wireDataChannel(event.channel);
    await peerConnection.setRemoteDescription({ type: 'offer', sdp });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    if (answer.sdp) {
      this.sendSignal({ type: 'answer', sdp: answer.sdp });
    }
    this.armIceTimer();
  }

  private createPeerConnection(): RTCPeerConnection {
    this.teardownPeerConnection();
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: GAMEPAD_STUN_SERVERS }],
    });
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice',
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };
    this.peerConnection = peerConnection;
    return peerConnection;
  }

  private wireDataChannel(dataChannel: RTCDataChannel): void {
    this.dataChannel = dataChannel;
    dataChannel.onopen = () => {
      this.clearIceTimer();
      this.setMode('DATA_CHANNEL');
    };
    dataChannel.onmessage = (event) => {
      this.options.onMessage(
        JSON.parse(String(event.data)) as GamepadChannelMessage,
      );
    };
    dataChannel.onclose = () => {
      if (!this.closed) {
        this.setMode('RELAY');
      }
    };
  }

  private armIceTimer(): void {
    this.clearIceTimer();
    this.iceTimerId = window.setTimeout(() => {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        this.teardownPeerConnection();
        this.setMode('RELAY');
      }
    }, GAMEPAD_ICE_TIMEOUT_MS);
  }

  private clearIceTimer(): void {
    if (this.iceTimerId !== null) {
      window.clearTimeout(this.iceTimerId);
      this.iceTimerId = null;
    }
  }

  private teardownPeerConnection(): void {
    if (this.dataChannel) {
      this.dataChannel.onopen = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.onclose = null;
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ondatachannel = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  private setMode(mode: GamepadTransportMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.options.onModeChange(mode);
    }
  }

  private sendSignal(message: GamepadSignalMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
