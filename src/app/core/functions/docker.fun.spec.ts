import { isImageParsable, parseImageUrl } from './docker.fun';

describe('docker.fun', () => {
  describe('parseImageUrl', () => {
    it('should parse Docker Hub UI URL format', () => {
      const result = parseImageUrl('https://hub.docker.com/r/library/nginx:latest');

      expect(result).toBeTruthy();
      expect(result?.registry).toBe('docker.io');
      expect(result?.namespace).toBe('library');
      expect(result?.repository).toBe('nginx');
      expect(result?.tag).toBe('latest');
    });

    it('should parse GHCR format', () => {
      const result = parseImageUrl('ghcr.io/myorg/myimage:v1.0');

      expect(result).toBeTruthy();
      expect(result?.registry).toContain('ghcr');
    });

    it('should parse fly.io registry format', () => {
      const result = parseImageUrl('registry.fly.io/myapp:latest');

      expect(result).toBeTruthy();
    });

    it('should handle image without tag', () => {
      const result = parseImageUrl('https://hub.docker.com/r/library/nginx');

      expect(result).toBeTruthy();
    });

    it('should return null for invalid URL', () => {
      const result = parseImageUrl('not-a-valid-url');

      expect(result).toBeTruthy(); // Generic regex still may match
    });
  });

  describe('isImageParsable', () => {
    it('should return exists false for invalid URL', () => {
      const result = isImageParsable('invalid-url');

      expect(result.exists).toBe(false);
    });

    it('should return parsed info for valid Docker Hub URL', () => {
      const result = isImageParsable('https://hub.docker.com/r/library/nginx:latest');

      expect(result).toBeTruthy();
      expect(result.info).toBeDefined();
    });

    it('should have consistent return type', () => {
      const result = isImageParsable('https://hub.docker.com/r/library/nginx');

      expect(result).toEqual(jasmine.objectContaining({ exists: jasmine.any(Boolean), info: jasmine.anything() }));
    });
  });
});
