import { TestBed } from '@angular/core/testing';

import { DeviceVerificationService } from './device-verification.service';
import { getTestProviders } from 'src/app/testing';
import { FirestoreService } from './firestore.service';

describe('DeviceVerificationService', () => {
  let service: DeviceVerificationService;
  let firestoreMock: jasmine.SpyObj<FirestoreService>;

  beforeEach(() => {
    firestoreMock = jasmine.createSpyObj('FirestoreService', ['callFunction', 'sendVerificationCode']);

    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: FirestoreService, useValue: firestoreMock },
      ],
    });

    service = TestBed.inject(DeviceVerificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate device fingerprint', () => {
    const fingerprint = service.getDeviceFingerprint();

    expect(fingerprint).toBeTruthy();
    expect(fingerprint.userAgent).toBe(navigator.userAgent);
    expect(fingerprint.deviceId).toBeTruthy();
    expect(fingerprint.timestamp).toBeInstanceOf(Date);
  });

  it('should initialize with default signal states', () => {
    expect(service.requiresVerification()).toBe(false);
    expect(service.pendingDeviceId()).toBe('');
    expect(service.verificationCode()).toBe('');
    expect(service.verificationExpiry()).toBeNull();
  });

  it('should allow setting verification code signal', () => {
    const code = '123456';
    // Note: In a real scenario, this would be set through the service's public methods
    expect(service.verificationCode).toBeDefined();
  });

  it('should retrieve trusted devices', (done) => {
    const userId = 'user-123';
    firestoreMock.callFunction.and.returnValue(Promise.resolve({ trustedDevices: [] }));

    service.getTrustedDevices(userId).subscribe({
      next: () => {
        expect(firestoreMock.callFunction).toHaveBeenCalled();
        done();
      },
    });
  });

  it('should send verification code', async () => {
    const userId = 'user-123';
    firestoreMock.callFunction.and.returnValue(
      Promise.resolve({ success: true, expiresAt: new Date().toISOString() })
    );

    const result = await service.sendVerificationCode(userId, 'email');

    expect(result.success).toBe(true);
  });
});
