import { TestBed } from '@angular/core/testing';

import { ExtensionService } from './extgrpc.service';
import { getTestProviders } from 'src/app/testing';
import { BrowserToken } from './browser.service';

describe('ExtgrpcService', () => {
  let service: ExtensionService;
  let browserMock: any;

  beforeEach(() => {
    browserMock = {
      runtime: {
        sendMessage: jasmine.createSpy('sendMessage').and.callFake(
          (_id: string, _payload: any, callback: (response: any) => void) => callback({ cookies: [{ name: 'sid' }] }),
        ),
      },
    };

    TestBed.configureTestingModule({
      providers: [...getTestProviders(), { provide: BrowserToken, useValue: browserMock }],
    });

    service = TestBed.inject(ExtensionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve cookies when extension returns cookie payload', async () => {
    const cookies = await service.fetchCookies('example.com');

    expect(browserMock.runtime.sendMessage).toHaveBeenCalled();
    expect(cookies).toEqual([{ name: 'sid' }]);
  });

  it('should reject when extension returns no cookies', async () => {
    browserMock.runtime.sendMessage.and.callFake(
      (_id: string, _payload: any, callback: (response: any) => void) => callback({}),
    );

    await expectAsync(service.fetchCookies('example.com')).toBeRejected();
  });
});
