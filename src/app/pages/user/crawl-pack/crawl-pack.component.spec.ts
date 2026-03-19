import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { CrawlPackComponent } from './crawl-pack.component';
import { getTestProviders } from 'src/app/testing';

describe('CrawlPackComponent', () => {
  let component: CrawlPackComponent;
  let fixture: ComponentFixture<CrawlPackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlPackComponent],
      providers: getTestProviders(),
    })
    // Override imports to remove AppTabsComponent (from the components barrel)
    // whose transitive import of RippleDirective through the directives barrel
    // creates a circular dependency that causes `undefined` exports (ɵcmp error).
    .overrideComponent(CrawlPackComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrawlPackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
