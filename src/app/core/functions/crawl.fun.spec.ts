import { crawlOperationStatusColor } from './crawl.fun';
import { CrawlOperationStatus } from '../enum';

describe('crawl.fun', () => {
  describe('crawlOperationStatusColor', () => {
    it('should return cyan for IN_PROGRESS status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.IN_PROGRESS);
      expect(color).toBe('cyan');
    });

    it('should return red for FAILED status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.FAILED);
      expect(color).toBe('red');
    });

    it('should return deep-orange for CANCELED status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.CANCELED);
      expect(color).toBe('deep-orange');
    });

    it('should return emerald for SCHEDULED status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.SCHEDULED);
      expect(color).toBe('emerald');
    });

    it('should return green for COMPLETED status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.COMPLETED);
      expect(color).toBe('green');
    });

    it('should return blue for STARTED status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.STARTED);
      expect(color).toBe('blue');
    });

    it('should return gray for READY status', () => {
      const color = crawlOperationStatusColor(CrawlOperationStatus.READY);
      expect(color).toBe('gray');
    });

    it('should return gray as default for unknown status', () => {
      const color = crawlOperationStatusColor('UNKNOWN' as any);
      expect(color).toBe('gray');
    });

    it('should always return a valid color string', () => {
      const validColors = [
        'cyan',
        'red',
        'deep-orange',
        'emerald',
        'green',
        'blue',
        'gray',
      ];

      for (const status of Object.values(CrawlOperationStatus)) {
        const color = crawlOperationStatusColor(status);
        expect(validColors).toContain(color);
      }
    });
  });
});
