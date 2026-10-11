import { registerOfflineFallbackWorker } from './offline-fallback-worker';

function navigatorWith(register: () => Promise<unknown>): Navigator {
  return { serviceWorker: { register } } as unknown as Navigator;
}

describe('registerOfflineFallbackWorker', () => {
  it('registers the offline fallback worker when the browser supports service workers', () => {
    const register = vi.fn().mockResolvedValue(undefined);

    registerOfflineFallbackWorker(navigatorWith(register));

    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('leaves a browser without service workers untouched', () => {
    expect(() => registerOfflineFallbackWorker({} as Navigator)).not.toThrow();
  });

  it('keeps the application running when the registration fails', async () => {
    const register = vi.fn().mockRejectedValue(new Error('denied'));

    registerOfflineFallbackWorker(navigatorWith(register));
    await Promise.resolve();

    expect(register).toHaveBeenCalledOnce();
  });
});
