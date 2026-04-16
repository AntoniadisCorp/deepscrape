import { TestBed } from '@angular/core/testing';

import { AiAPIService } from './aiapi.service';
import { getTestProviders } from 'src/app/testing';

describe('AiserviceService', () => {
  let service: AiAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(AiAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose all primary AI transport methods', () => {
    expect(typeof service.sendToJinaAI).toBe('function');
    expect(typeof service.sendToClaudeAI).toBe('function');
    expect(typeof service.sendToOpenAI).toBe('function');
  });

  it('should initialize model endpoint configuration', () => {
    expect((service as any).claudeAiEndpoint).toContain('/messages');
    expect((service as any).openAiEndpoint).toContain('/chat/completions');
    expect((service as any).groqAiEndpoint).toContain('/chat/completions');
    expect((service as any).jinaAiEndpoint).toContain('/');
  });
});
