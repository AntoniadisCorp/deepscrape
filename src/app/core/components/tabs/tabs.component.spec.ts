import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { AppTabsComponent } from './tabs.component';
import { ScreenResizeService } from '../../services';
import { getTestProviders } from 'src/app/testing';

describe('AppTabsComponent', () => {
  let component: AppTabsComponent;

  const resizeServiceStub = {
    onResize$: new Subject(),
  } as unknown as ScreenResizeService;

  const cdrStub = {
    detectChanges: jasmine.createSpy('detectChanges'),
  } as unknown as ChangeDetectorRef;

  const routerStub = {
    events: new Subject(),
  } as unknown as Router;

  const routeStub = {} as ActivatedRoute;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...getTestProviders()],
    });

    component = TestBed.runInInjectionContext(
      () => new AppTabsComponent('browser', resizeServiceStub, cdrStub, routerStub)
    );
  });

  it('should build child route for populated link', () => {
    component.sourceTabUrl = 'crawlpack';
    expect(component.setRoutes('machines')).toEqual(['/', 'crawlpack', 'machines']);
  });

  it('should build source route for empty link', () => {
    component.sourceTabUrl = 'crawlpack';
    expect(component.setRoutes('')).toEqual(['/', 'crawlpack']);
  });

  it('should parse numeric translateX values', () => {
    component.transformX = '-42px';
    expect(component.getTranslateX()).toBe(-42);
  });

  it('should compute translate percentage based on tab widths', () => {
    const tabsSelector = document.createElement('div');
    const tabsContainer = document.createElement('div');
    Object.defineProperty(tabsSelector, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(tabsContainer, 'clientWidth', { value: 500, configurable: true });

    (component as unknown as { tabsSelector: { nativeElement: HTMLElement }, tabsContainer: { nativeElement: HTMLElement } }).tabsSelector = { nativeElement: tabsSelector };
    (component as unknown as { tabsSelector: { nativeElement: HTMLElement }, tabsContainer: { nativeElement: HTMLElement } }).tabsContainer = { nativeElement: tabsContainer };

    expect(component.getTranslateXPercentage(-150)).toBe(-50);
  });

  it('should toggle previous and next scroll controls from translate position', () => {
    const tabsSelector = document.createElement('div');
    const tabsContainer = document.createElement('div');
    Object.defineProperty(tabsSelector, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(tabsContainer, 'clientWidth', { value: 500, configurable: true });

    (component as unknown as { tabsSelector: { nativeElement: HTMLElement }, tabsContainer: { nativeElement: HTMLElement } }).tabsSelector = { nativeElement: tabsSelector };
    (component as unknown as { tabsSelector: { nativeElement: HTMLElement }, tabsContainer: { nativeElement: HTMLElement } }).tabsContainer = { nativeElement: tabsContainer };

    component.transformX = '0px';
    component.checkScrollButtons();
    expect(component.showPreviousButton).toBeFalse();
    expect(component.showNextButton).toBeTrue();

    component.transformX = '-300px';
    component.checkScrollButtons();
    expect(component.showPreviousButton).toBeFalse();
    expect(component.showNextButton).toBeFalse();
  });
});
