import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { IfEntitledDirective } from './if-entitled.directive';
import { BillingService } from '../services';
import { getTestProviders } from 'src/app/testing';

@Component({
  selector: 'app-test-if-entitled',
  template: `
    <div *ifEntitled="feature">
      Premium Feature
    </div>
  `,
  standalone: true,
  imports: [IfEntitledDirective],
})
class TestComponent {
  feature = 'advanced-crawl';
}

describe('IfEntitledDirective', () => {
  let billingServiceMock: jasmine.SpyObj<BillingService>;
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    billingServiceMock = jasmine.createSpyObj('BillingService', ['hasFeature$']);

    await TestBed.configureTestingModule({
      imports: [TestComponent, IfEntitledDirective],
      providers: [
        ...getTestProviders(),
        { provide: BillingService, useValue: billingServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
  });

  it('should show content when user is entitled to feature', () => {
    billingServiceMock.hasFeature$.and.returnValue(of(true));

    fixture.detectChanges();
    const content = debugElement.query(By.css('div'));

    expect(content).toBeTruthy();
    expect(content.nativeElement.textContent).toContain('Premium Feature');
  });

  it('should hide content when user is not entitled to feature', () => {
    billingServiceMock.hasFeature$.and.returnValue(of(false));

    fixture.detectChanges();
    const content = debugElement.query(By.css('div'));

    expect(content).toBeFalsy();
  });

  it('should check entitlement for specified feature', () => {
    billingServiceMock.hasFeature$.and.returnValue(of(true));
    component.feature = 'organization-api';

    fixture.detectChanges();

    expect(billingServiceMock.hasFeature$).toHaveBeenCalledWith('organization-api');
  });

  it('should evaluate entitlement for a changed feature before first render', () => {
    billingServiceMock.hasFeature$.and.returnValue(of(true));
    component.feature = 'different-feature';
    fixture.detectChanges();

    const content = debugElement.query(By.css('div'));
    expect(content).toBeTruthy();
    expect(billingServiceMock.hasFeature$).toHaveBeenCalledWith('different-feature');
  });

  it('should unsubscribe on destroy', () => {
    billingServiceMock.hasFeature$.and.returnValue(of(true));
    fixture.detectChanges();

    fixture.destroy();

    expect(billingServiceMock.hasFeature$).toHaveBeenCalled();
  });
});
