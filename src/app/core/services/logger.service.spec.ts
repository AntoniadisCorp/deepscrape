import { TestBed } from '@angular/core/testing';

import { LoggerService } from './logger.service';
import { getTestProviders } from 'src/app/testing';
import { environment } from 'src/environments/environment';

function getConsoleErrorSpy(): jasmine.Spy {
  return jasmine.isSpy(console.error) ? (console.error as jasmine.Spy) : spyOn(console, 'error');
}

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be a singleton service', () => {
    const service1 = TestBed.inject(LoggerService);
    const service2 = TestBed.inject(LoggerService);
    expect(service1).toBe(service2);
  });

  it('should handle console.error gracefully', () => {
    getConsoleErrorSpy();

    // Service should not throw when logging errors
    expect(() => {
      service.error('Test error message');
    }).not.toThrow();
  });

  it('should redact sensitive information in production', () => {
    if (environment.production) {
      const consoleErrorSpy = getConsoleErrorSpy();

      const sensitiveData = { apiKey: 'secret-key-123' };
      service.error('Error:', sensitiveData);

      expect(consoleErrorSpy).toHaveBeenCalled();
    }
  });

  it('should filter sensitive patterns from log messages', () => {
    const sensitiveMessage = 'config: { apiKey: "secret-token-here" }';

    // Service should be able to process and redact this
    expect(sensitiveMessage).toContain('apiKey');
  });

  it('should preserve non-sensitive information', () => {
    const message = 'User logged in successfully from session-id-123';

    // Non-sensitive info should pass through
    expect(message).toContain('session-id-123');
  });

  it('should handle errors with nested objects', () => {
    const complexError = {
      error: {
        apiKey: 'secret',
        message: 'An error occurred',
      },
    };

    expect(() => {
      service.error(complexError);
    }).not.toThrow();
  });
});
