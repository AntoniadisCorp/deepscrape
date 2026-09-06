import { HttpErrorResponse } from '@angular/common/http';

import { handleError, isArray } from './global.fun';

function getConsoleErrorSpy(): jasmine.Spy {
  return jasmine.isSpy(console.error) ? (console.error as jasmine.Spy) : spyOn(console, 'error');
}

describe('global.fun', () => {
  describe('handleError', () => {
    it('should handle HttpErrorResponse with client-side error', (done) => {
      const clientError = new ErrorEvent('error', {
        message: 'Client side error',
      });

      const httpError = new HttpErrorResponse({
        error: clientError,
        status: 0,
      });

      const consoleErrorSpy = getConsoleErrorSpy();
      handleError(httpError).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(consoleErrorSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle HttpErrorResponse with server-side error', (done) => {
      const httpError = new HttpErrorResponse({
        error: 'Server error',
        status: 500,
        statusText: 'Internal Server Error',
      });

      const consoleErrorSpy = getConsoleErrorSpy();
      handleError(httpError).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(consoleErrorSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle Error instance', (done) => {
      const error = new Error('Test error');

      const consoleErrorSpy = getConsoleErrorSpy();
      handleError(error).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(consoleErrorSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should handle unknown error type', (done) => {
      const unknownError = { custom: 'error object' };

      const consoleErrorSpy = getConsoleErrorSpy();
      handleError(unknownError).subscribe({
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown error:', unknownError);
          done();
        },
      });
    });

    it('should return observable with error state', (done) => {
      const httpError = new HttpErrorResponse({ status: 404 });

      handleError(httpError).subscribe({
        next: () => fail('Should not emit next'),
        error: (err) => {
          expect(err.message).toContain('An error occurred');
          done();
        },
      });
    });

    it('should log error details for server errors', (done) => {
      const consoleErrorSpy = getConsoleErrorSpy();

      const httpError = new HttpErrorResponse({
        error: { message: 'Database error' },
        status: 500,
      });

      handleError(httpError).subscribe({
        error: () => {
          expect(consoleErrorSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('isArray', () => {
    it('should return true for non-empty array', () => {
      const result = isArray([1, 2, 3]);
      expect(result).toBe(true);
    });

    it('should return false for empty array', () => {
      const result = isArray([]);
      expect(result).toBe(false);
    });

    it('should return false for non-array objects', () => {
      const result = isArray({ key: 'value' });
      expect(result).toBe(false);
    });

    it('should return false for string', () => {
      const result = isArray('not an array');
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isArray(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = isArray(undefined);
      expect(result).toBe(false);
    });

    it('should return true for array with mixed types', () => {
      const result = isArray([1, 'string', { key: 'value' }, null]);
      expect(result).toBe(true);
    });

    it('should work as type guard', () => {
      const value: unknown = [1, 2, 3];

      if (isArray(value)) {
        // TypeScript should narrow type to Array<unknown>
        expect(value.length).toBe(3);
      }
    });

    it('should reject array-like objects', () => {
      const arrayLike = { length: 2, 0: 'a', 1: 'b' };
      const result = isArray(arrayLike);
      expect(result).toBe(false);
    });
  });
});
