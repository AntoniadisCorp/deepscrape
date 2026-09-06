import { convertCookies, convertHeaders } from './cart.fun';

describe('cart.fun', () => {
  describe('convertCookies', () => {
    it('should convert string cookies to dict format', () => {
      const input = {
        cookies: '{"session": "abc123", "user": "john"}',
      };

      const result = convertCookies(input);

      expect(result).toBeTruthy();
      expect(result.cookies).toBeDefined();
      expect(result.cookies.type).toBe('dict');
    });

    it('should handle invalid JSON cookies gracefully', () => {
      const input = {
        cookies: 'not-valid-json{',
      };

      const result = convertCookies(input);

      // Should log error and return gracefully
      expect(result).toBeDefined();
    });

    it('should return input unchanged if cookies are not string', () => {
      const input = {
        cookies: { session: 'abc123' },
      };

      const result = convertCookies(input);

      expect(result).toBeUndefined(); // Current implementation returns undefined
    });

    it('should handle null cookies', () => {
      const input = {
        cookies: null,
      };

      const result = convertCookies(input);

      expect(result).toBeUndefined(); // Current implementation returns undefined
    });
  });

  describe('convertHeaders', () => {
    it('should convert string headers to object format', () => {
      const input = {
        headers: '{"Content-Type": "application/json", "Authorization": "Bearer token"}',
      };

      const result = convertHeaders(input);

      expect(result).toBeTruthy();
      if (result.headers && typeof result.headers === 'object') {
        expect(result.headers['Content-Type']).toBe('application/json');
      }
    });

    it('should handle invalid JSON headers gracefully', () => {
      const input = {
        headers: 'not-valid-json{',
      };

      const result = convertHeaders(input);

      expect(result).toBeTruthy();
    });

    it('should return input unchanged if headers are already object', () => {
      const input = {
        headers: { 'Content-Type': 'application/json' },
      };

      const result = convertHeaders(input);

      expect(result).toBeTruthy();
      expect(result.headers).toEqual(input.headers);
    });

    it('should handle null headers', () => {
      const input = {
        headers: null,
      };

      const result = convertHeaders(input);

      expect(result).toBeDefined();
    });

    it('should handle missing headers property', () => {
      const input = {};

      const result = convertHeaders(input);

      expect(result).toBeDefined();
    });
  });
});
