import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { GooglePlayBilling } from './google-play-billing';

function setup(navigator: object): GooglePlayBilling {
  TestBed.configureTestingModule({
    providers: [
      { provide: DOCUMENT, useValue: { defaultView: { navigator } } },
    ],
  });
  return TestBed.inject(GooglePlayBilling);
}

describe('GooglePlayBilling.isRunningInGoogleChrome', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('recognizes Google Chrome from its user agent brands', () => {
    const billing = setup({
      userAgentData: {
        brands: [{ brand: 'Chromium' }, { brand: 'Google Chrome' }],
      },
    });

    expect(billing.isRunningInGoogleChrome()).toBe(true);
  });

  it('rejects another Chromium browser such as Samsung Internet', () => {
    const billing = setup({
      userAgentData: {
        brands: [{ brand: 'Chromium' }, { brand: 'Samsung Internet' }],
      },
    });

    expect(billing.isRunningInGoogleChrome()).toBe(false);
  });

  it('rejects a browser that exposes no user agent brands', () => {
    const billing = setup({});

    expect(billing.isRunningInGoogleChrome()).toBe(false);
  });
});
