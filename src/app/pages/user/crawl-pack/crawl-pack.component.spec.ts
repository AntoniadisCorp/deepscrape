import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ActivatedRoute, ChildrenOutletContexts, convertToParamMap, NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';

import { CrawlPackComponent } from './crawl-pack.component';
import { LinkTabs } from 'src/app/core/types';
import { getTestProviders } from 'src/app/testing';

describe('CrawlPackComponent', () => {
  let component: CrawlPackComponent;
  const events$ = new Subject<unknown>();
  const unsubscribeSpy = jasmine.createSpy('unsubscribe');
  const contextsStub = {
    getContext: () => ({ route: { snapshot: { data: { animation: 'slide' } } } }),
  };

  const routeStub = {
    paramMap: of(convertToParamMap({})),
  } as ActivatedRoute;

  const routerStub = {
    url: '/crawlpack/machines',
    events: events$,
  } as unknown as Router;

  const cdrStub = {
    markForCheck: jasmine.createSpy('markForCheck'),
    detectChanges: jasmine.createSpy('detectChanges'),
  } as unknown as ChangeDetectorRef;

  const destroyRefStub = {
    onDestroy: (_cb: () => void) => {},
  } as DestroyRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...getTestProviders(),
        { provide: ChildrenOutletContexts, useValue: contextsStub },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new CrawlPackComponent(cdrStub, routeStub, routerStub, destroyRefStub)
    );

    (component as unknown as { routerEventSubscription: { unsubscribe: () => void } }).routerEventSubscription = {
      unsubscribe: unsubscribeSpy,
    };
  });

  it('should initialize tabs on ngOnInit', () => {
    component.ngOnInit();
    const tabs = (component as unknown as { tabs: LinkTabs[] }).tabs;
    expect(tabs.length).toBe(6);
  });

  it('should activate matching tab when navigation ends', () => {
    component.ngOnInit();
    events$.next(new NavigationEnd(1, '/crawlpack/machines', '/crawlpack/machines'));

    const tabs = (component as unknown as { tabs: LinkTabs[] }).tabs;
    const machinesTab = tabs.find((tab) => tab.link === 'machines');
    expect(machinesTab?.active).toBeTrue();
  });

  it('should expose route animation data from outlet context', () => {
    expect(component.getAnimationData()).toBe('slide');
  });

  it('should unsubscribe router events on destroy', () => {
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
