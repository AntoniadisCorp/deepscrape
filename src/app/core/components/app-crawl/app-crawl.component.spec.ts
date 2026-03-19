import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { AppCrawlComponent } from './app-crawl.component';
import { CrawlOperationStatus } from '../../enum';
import { CrawlPack } from '../../types';
import { AuthService, CrawlAPIService, FirestoreService, OperationStatusService, SnackbarService } from '../../services';
import { getTestProviders } from 'src/app/testing';

describe('AppCrawlComponent', () => {
  let component: AppCrawlComponent;

  const routeStub = {} as ActivatedRoute;
  const authServiceStub = {
    user$: of({
      uid: 'user-1',
      currProviderData: { displayName: 'Test User' },
    }),
  } as unknown as AuthService;

  const firestoreServiceStub = {
    loadPreviousPacks: () => Promise.resolve([]),
  } as unknown as FirestoreService;

  const crawlServiceStub = {
    multiCrawlEnqueue: () => of(),
    streamTaskResults: () => of(),
  } as unknown as CrawlAPIService;

  const operationStatusStub = {} as OperationStatusService;
  const snackbarServiceStub = { showSnackbar: jasmine.createSpy('showSnackbar') } as unknown as SnackbarService;
  const cdrStub = {
    markForCheck: jasmine.createSpy('markForCheck'),
    detectChanges: jasmine.createSpy('detectChanges'),
  } as unknown as ChangeDetectorRef;
  const routerStub = { url: '/playground' } as Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        FormBuilder,
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new AppCrawlComponent(
        routeStub,
        authServiceStub,
        firestoreServiceStub,
        crawlServiceStub,
        operationStatusStub,
        snackbarServiceStub,
        cdrStub,
        TestBed.inject(FormBuilder),
        routerStub
      )
    );

    component.ngOnInit();
  });

  it('should initialize required crawl form controls', () => {
    expect(component.urls).toBeTruthy();
    expect(component.userprompt).toBeTruthy();
    expect(component.submitButton).toBeTruthy();
    expect(component.crawlOptions).toBeTruthy();
  });

  it('should build operation payload using current form values', () => {
    component.urls.setValue('https://a.dev,https://b.dev');
    component.userprompt.setValue('extract links');
    const crawlPack = {
      id: 'pack-1',
      uid: 'user-1',
      title: 'Pack',
      type: 'crawl4ai',
      created_at: new Date(),
      config: { type: ['crawler'], value: {} },
    } satisfies Partial<CrawlPack>;
    component.crawlpack = crawlPack as CrawlPack;

    const payload = component.setupOperationData();

    expect(payload.status).toBe(CrawlOperationStatus.READY);
    expect(payload.metadataId).toBe('pack-1');
    expect(payload.urls).toEqual(['https://a.dev', 'https://b.dev']);
    expect(payload.prompt).toBe('extract links');
  });

  it('should include user and route metadata in operation payload', () => {
    component.urls.setValue('https://single.dev');
    component.userprompt.setValue('extract');

    const payload = component.setupOperationData();

    expect(payload.author.uid).toBe('user-1');
    expect(payload.urlPath).toBe('/playground');
    expect(payload.urls).toEqual(['https://single.dev']);
  });

  it('should stop submit when crawl pack selection is default', () => {
    spyOn(component, 'crawlEnqueue');

    component.urls.setValue('https://single.dev');
    component.crawlPackSelector.setValue({ name: 'select a crawlpack', code: 'default' });

    component.submitCrawlJob();

    expect(component.crawlEnqueue).not.toHaveBeenCalled();
  });
});
