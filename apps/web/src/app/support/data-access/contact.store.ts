import { ContactReceiptDto } from '@psychotech/shared';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type ContactSendStatus =
  | 'idle'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'rate-limited';

interface ContactState {
  formToken: string | null;
  status: ContactSendStatus;
  receipt: ContactReceiptDto | null;
}

const initialState: ContactState = {
  formToken: null,
  status: 'idle',
  receipt: null,
};

export const ContactStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setFormToken(formToken: string | null): void {
      patchState(store, { formToken });
    },
    startSending(): void {
      patchState(store, { status: 'sending' });
    },
    setSent(receipt: ContactReceiptDto): void {
      patchState(store, { status: 'sent', receipt, formToken: null });
    },
    setFailed(status: 'failed' | 'rate-limited'): void {
      patchState(store, { status });
    },
    reset(): void {
      patchState(store, { status: 'idle', receipt: null });
    },
  })),
);
