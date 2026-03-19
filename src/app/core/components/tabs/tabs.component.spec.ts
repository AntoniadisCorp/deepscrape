import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { AppTabsComponent } from './tabs.component';
import { getTestProviders } from 'src/app/testing';

describe('AppTabsComponent', () => {
  let component: AppTabsComponent;
  let fixture: ComponentFixture<AppTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTabsComponent],
      providers: getTestProviders(),
    })
    // Override imports to remove barrel-based directives (RippleDirective,
    // TouchEventsDirective) that create circular dependencies through the
    // directives barrel → tooltip.directive → components barrel chain,
    // causing some barrel exports to resolve to `undefined` (ɵcmp error).
    .overrideComponent(AppTabsComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
