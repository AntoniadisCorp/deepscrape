import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PlaygroundComponent } from './playground.component';
import { getTestProviders } from 'src/app/testing';

describe('PlaygroundComponent', () => {
  let component: PlaygroundComponent;
  let fixture: ComponentFixture<PlaygroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaygroundComponent],
      providers: getTestProviders(),
    })
    // Override imports to remove components/directives loaded through barrels
    // (AppCrawlComponent, AppLLMScrapeComponent, DomainSeederComponent,
    // HiddenDragScrollDirective) whose transitive barrel chains create circular
    // dependencies that cause `undefined` exports (ɵcmp error) in the test bundle.
    .overrideComponent(PlaygroundComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaygroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
