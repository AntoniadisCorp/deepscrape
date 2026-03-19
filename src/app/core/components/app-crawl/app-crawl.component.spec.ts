import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AppCrawlComponent } from './app-crawl.component';
import { getTestProviders } from 'src/app/testing';

describe('AppCrawlComponent', () => {
  let component: AppCrawlComponent;
  let fixture: ComponentFixture<AppCrawlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppCrawlComponent],
      providers: getTestProviders(),
    })
    // Override the component's imports to remove barrel-based directives
    // (RippleDirective, RemoveToolbarDirective) that cause a circular-dependency
    // issue in the test bundle where some barrel exports resolve to `undefined`
    // (ɵcmp error). NO_ERRORS_SCHEMA suppresses unknown-element/directive errors.
    .overrideComponent(AppCrawlComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppCrawlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
