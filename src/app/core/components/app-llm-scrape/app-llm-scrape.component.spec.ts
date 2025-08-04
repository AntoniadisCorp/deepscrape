import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { InjectionToken } from '@angular/core';
import { SnackBarType } from '../snackbar/snackbar.component';

import { AppLLMScrapeComponent } from './app-llm-scrape.component';
import { browserProvider, BrowserToken, STORAGE_PROVIDERS, windowProvider, WindowToken } from '../../services';
import { Subscription } from 'rxjs';

class FirestoreMock { }
class AuthMock { }


describe('AppLLMScrapeComponent', () => {
  let component: AppLLMScrapeComponent;
  let fixture: ComponentFixture<AppLLMScrapeComponent>;
  let windowMock = {
    localStorage: {
      getItem: jasmine.createSpy('getItem'),
      setItem: jasmine.createSpy('setItem'),
      removeItem: jasmine.createSpy('removeItem'),
      clear: jasmine.createSpy('clear'),
      key: jasmine.createSpy('key'),
      length: 0,
    },
    sessionStorage: {
      getItem: jasmine.createSpy('getItem'),
      setItem: jasmine.createSpy('setItem'),
      removeItem: jasmine.createSpy('removeItem'),
      clear: jasmine.createSpy('clear'),
      key: jasmine.createSpy('key'),
      length: 0,
    },
  } as any;

  let aiResultsSub: Subscription;
  let forkJoinSubscription: Subscription;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLLMScrapeComponent],
      providers: [
        provideHttpClient(),
        { provide: Firestore, useClass: FirestoreMock },
        { provide: Auth, useClass: AuthMock },
        STORAGE_PROVIDERS,
        // { provide: WindowToken, useValue: windowMock },
        { provide: WindowToken, useFactory: windowProvider },
        { provide: BrowserToken, useFactory: browserProvider },
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AppLLMScrapeComponent);
    component = fixture.componentInstance;
    aiResultsSub = new Subscription();
    forkJoinSubscription = new Subscription();
    component.aiResultsSub = aiResultsSub;
    component.forkJoinSubscription = forkJoinSubscription;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form controls with default values', () => {
    expect(component.url.value).toBe('');
    expect(component.userprompt.value).toBe('');
    expect(component.submitButton.value).toBe(false);
    expect(component.modelAI.value).toEqual({ name: 'claude-3-5-haiku-20241022', code: 'claude' });
  });

  it('should disable and enable form controls correctly', () => {
    (component as any).disableForm();
    expect(component.url.disabled).toBeTruthy();
    expect(component.userprompt.disabled).toBeTruthy();
    expect(component.submitButton.value).toBeTruthy();
    expect(component.modelAI.disabled).toBeTruthy();

    (component as any).enableForm();
    expect(component.url.enabled).toBeTruthy();
    expect(component.userprompt.enabled).toBeTruthy();
    expect(component.submitButton.value).toBeFalsy();
    expect(component.modelAI.enabled).toBeTruthy();
  });

  it('should reset results and unsubscribe on closeResults', () => {
    spyOn(component.aiResultsSub, 'unsubscribe').and.callThrough();
    spyOn(component.forkJoinSubscription, 'unsubscribe').and.callThrough();

    (component as any).jsonChunk['content'] = 'test content';
    (component as any).jsonChunk['usage'] = { total_tokens: 10, total_cost: 1 };
    (component as any).isGetResults = true;

    (component as any).closeResults();

    expect((component as any).isGetResults).toBeFalsy();
    expect((component as any).jsonChunk['content']).toBe('');
    expect((component as any).jsonChunk['usage']).toBeNull();
    expect(component.aiResultsSub.unsubscribe).toHaveBeenCalled();
    expect(component.forkJoinSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should abort requests and reset states on abortRequests', () => {
    spyOn((component as any).destroy$, 'next').and.callThrough();
    spyOn((component as any).destroy$, 'complete').and.callThrough();
    spyOn(component as any, 'enableForm').and.callThrough();
    spyOn(component, 'showSnackbar').and.callThrough();

    (component as any).isResultsProcessing = true;
    (component as any).isCrawlProcessing = true;

    component.abortRequests();

    expect((component as any).destroy$.next).toHaveBeenCalled();
    expect((component as any).isResultsProcessing).toBeFalsy();
    expect((component as any).isCrawlProcessing).toBeFalsy();
    expect((component as any)['enableForm']).toHaveBeenCalled();
    expect(component.showSnackbar).toHaveBeenCalledWith('Request canceled', SnackBarType.info, '', 5000);
  });
});
