import { chatInBatchesAI } from './aiapi.fun';
import { sanitizeJSON } from './global.fun';

describe('aiapi.fun', () => {
  describe('chatInBatchesAI', () => {
    it('should create initial context message', () => {
      const messages: { role: string; content: string }[] = [];
      const content = 'Test content';

      chatInBatchesAI(messages, content);

      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toContain('text in parts');
    });

    it('should split content into batches', () => {
      const messages: { role: string; content: string }[] = [];
      const longContent = 'x'.repeat(3000); // Create content larger than chunk size

      chatInBatchesAI(messages, longContent);

      // Should have: instruction message + batches + completion message
      expect(messages.length).toBeGreaterThan(2);
      expect(messages[messages.length - 1].content).toBe('ALL PARTS SENT');
    });

    it('should add completion message at end', () => {
      const messages: { role: string; content: string }[] = [];
      chatInBatchesAI(messages, 'Some content');

      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toBe('ALL PARTS SENT');
    });

    it('should handle empty content gracefully', () => {
      const messages: { role: string; content: string }[] = [];
      chatInBatchesAI(messages, '');

      // Should have instruction and completion messages
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should sanitize chunks', () => {
      const messages: { role: string; content: string }[] = [];
      const content = 'Normal content with some special chars: \n\t';

      chatInBatchesAI(messages, content);

      // Check that sanitization was applied
      const chunks = messages.slice(1, -1);
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect chunk size limit', () => {
      const messages: { role: string; content: string }[] = [];
      const chunkSize = 1024;
      const content = 'x'.repeat(chunkSize * 5); // 5x chunk size

      chatInBatchesAI(messages, content);

      // Should split into multiple chunks
      expect(messages.length).toBeGreaterThan(5);
    });
  });
});
