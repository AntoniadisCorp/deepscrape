import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of, Subscription } from 'rxjs';

import { AppLLMScrapeComponent } from './app-llm-scrape.component';
import { AiAPIService, CrawlAPIService, LocalStorage, SnackbarService } from '../../services';
import { SnackBarType } from '../snackbar/snackbar.component';
import { getTestProviders } from 'src/app/testing';

describe('AppLLMScrapeComponent', () => {
  let component: AppLLMScrapeComponent;

  const localStorageSpy = jasmine.createSpyObj<Storage>('Storage', ['getItem', 'setItem', 'removeItem', 'clear', 'key']);
  const aiApiStub = {
    sendToOpenAI: jasmine.createSpy('sendToOpenAI').and.returnValue(of({ content: 'openai', usage: null, role: null })),
    sendToClaudeAI: jasmine.createSpy('sendToClaudeAI').and.returnValue(of({ content: 'claude', usage: null, role: 'assistant' })),
  } as unknown as AiAPIService;
  const crawlApiStub = {
    sendToCrawl4AI: jasmine.createSpy('sendToCrawl4AI').and.returnValue(of('crawled data')),
  } as unknown as CrawlAPIService;
  const snackbarServiceStub = {
    showSnackbar: jasmine.createSpy('showSnackbar'),
  } as unknown as SnackbarService;
  const cdrStub = {
    detectChanges: jasmine.createSpy('detectChanges'),
  } as unknown as ChangeDetectorRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        FormBuilder,
        { provide: LocalStorage, useValue: localStorageSpy },
      ],
    });

    localStorageSpy.getItem.calls.reset();
    localStorageSpy.setItem.calls.reset();
    localStorageSpy.getItem.and.callFake((key: string) => key === 'forwardCookies' ? 'true' : null);
    (aiApiStub.sendToOpenAI as jasmine.Spy).calls.reset();
    (aiApiStub.sendToClaudeAI as jasmine.Spy).calls.reset();
    (crawlApiStub.sendToCrawl4AI as jasmine.Spy).calls.reset();
    (snackbarServiceStub.showSnackbar as jasmine.Spy).calls.reset();
    (cdrStub.detectChanges as jasmine.Spy).calls.reset();

    component = TestBed.runInInjectionContext(
      () => new AppLLMScrapeComponent(
        aiApiStub,
        crawlApiStub,
        snackbarServiceStub,
        TestBed.inject(FormBuilder),
        cdrStub,
      )
    );

    component.aiResultsSub = new Subscription();
    component.forkJoinSubscription = new Subscription();
    component.ngOnInit();
  });

  it('should initialize controls and restore the forwardCookies preference', () => {
    expect(component.url.value).toBe('');
    expect(component.userprompt.value).toBe('');
    expect(component.submitButton.value).toBeFalse();
    expect(component.modelAI.value).toEqual({ name: 'claude-3-5-haiku-20241022', code: 'claude' });
    expect(component.options.get('forwardCookies')?.value).toBeTrue();
  });

  it('should persist forwardCookies changes to local storage', () => {
    component.options.get('forwardCookies')?.setValue(false);

    expect(localStorageSpy.setItem).toHaveBeenCalledWith('forwardCookies', 'false');
  });

  it('should not start processing while required inputs are invalid', () => {
    const processDataSpy = spyOn(component as never, 'processData' as never) as jasmine.Spy;

    (component as unknown as { onPromptSubmited(prompt: string): void }).onPromptSubmited('ignored');

    expect(processDataSpy).not.toHaveBeenCalled();
  });

  it('should disable the form and start processing for valid prompt submissions', () => {
    const processDataSpy = spyOn(component as never, 'processData' as never) as jasmine.Spy;
    const closeResultsSpy = spyOn(component as never, 'closeResults' as never).and.callThrough();

    component.url.setValue('https://example.com');
    component.userprompt.setValue('Summarize the content');

    (component as unknown as { onPromptSubmited(prompt: string): void }).onPromptSubmited('Summarize the content');

    expect(closeResultsSpy).toHaveBeenCalled();
    expect(component.url.disabled).toBeTrue();
    expect(component.userprompt.disabled).toBeTrue();
    expect(component.modelAI.disabled).toBeTrue();
    expect(component.submitButton.value).toBeTrue();
    expect(processDataSpy.calls.mostRecent().args).toEqual(['https://example.com', 'claude']);
    expect((component as unknown as { isCrawlProcessing: boolean }).isCrawlProcessing).toBeTrue();
  });

  it('should dispatch OpenAI model selection to the OpenAI client', () => {
    component.modelAI.setValue({ name: 'gpt-4o-mini', code: 'openai' });

    (component as unknown as { chooseAIModel(messages: { role: string; content: string }[]): unknown }).chooseAIModel([{ role: 'user', content: 'hello' }]);

    expect(aiApiStub.sendToOpenAI).toHaveBeenCalledWith([{ role: 'user', content: 'hello' }], 'gpt-4o-mini');
  });

  it('should reset results and unsubscribe active streams when closing results', () => {
    const aiResultsSub = new Subscription();
    const forkJoinSubscription = new Subscription();
    spyOn(aiResultsSub, 'unsubscribe').and.callThrough();
    spyOn(forkJoinSubscription, 'unsubscribe').and.callThrough();
    component.aiResultsSub = aiResultsSub;
    component.forkJoinSubscription = forkJoinSubscription;
    component.jsonChunk['content'] = 'partial';
    component.jsonChunk['usage'] = { total_tokens: 10, total_cost: 2 };
    (component as unknown as { isGetResults: boolean }).isGetResults = true;

    (component as unknown as { closeResults(): void }).closeResults();

    expect((component as unknown as { isGetResults: boolean }).isGetResults).toBeFalse();
    expect(component.jsonChunk['content']).toBe('');
    expect(component.jsonChunk['usage']).toBeNull();
    expect(aiResultsSub.unsubscribe).toHaveBeenCalled();
    expect(forkJoinSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should clear the URL input when onClearText is invoked', () => {
    component.url.setValue('https://example.com');

    component.onClearText();

    expect(component.url.value).toBe('');
  });

  it('should abort requests, re-enable the form, and show feedback', () => {
    const destroyNextSpy = spyOn((component as unknown as { destroy$: { next(): void } }).destroy$, 'next').and.callThrough();

    component.url.disable();
    component.userprompt.disable();
    component.modelAI.disable();
    component.submitButton.setValue(true);
    (component as unknown as { isResultsProcessing: boolean; isCrawlProcessing: boolean }).isResultsProcessing = true;
    (component as unknown as { isResultsProcessing: boolean; isCrawlProcessing: boolean }).isCrawlProcessing = true;

    component.abortRequests();

    expect(destroyNextSpy).toHaveBeenCalled();
    expect((component as unknown as { isResultsProcessing: boolean }).isResultsProcessing).toBeFalse();
    expect((component as unknown as { isCrawlProcessing: boolean }).isCrawlProcessing).toBeFalse();
    expect(component.url.enabled).toBeTrue();
    expect(component.userprompt.enabled).toBeTrue();
    expect(component.modelAI.enabled).toBeTrue();
    expect(component.submitButton.value).toBeFalse();
    expect(snackbarServiceStub.showSnackbar).toHaveBeenCalledWith('Request canceled', SnackBarType.info, '', 5000);
  });
});
