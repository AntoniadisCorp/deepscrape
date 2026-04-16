import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandPageComponent } from './landpage.component';
import { getTestProviders } from 'src/app/testing';

describe('LandpageComponent', () => {
  let component: LandPageComponent;
  let fixture: ComponentFixture<LandPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandPageComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(LandPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('togglePlan should switch between monthly and yearly', () => {
    component.selectedPlan = 'monthly';

    component.togglePlan();
    expect(component.selectedPlan).toBe('yearly');

    component.togglePlan();
    expect(component.selectedPlan).toBe('monthly');
  });

  it('onWindowScroll should set visibility based on page offset', () => {
    (component as any).window.pageYOffset = 120;
    component.onWindowScroll();
    expect(component.isVisible).toBeTrue();

    (component as any).window.pageYOffset = 0;
    component.onWindowScroll();
    expect(component.isVisible).toBeFalse();
  });

  it('scrollToTop should call window scrollTo with smooth behavior', () => {
    const scrollToSpy = spyOn((component as any).window, 'scrollTo');

    component.scrollToTop();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
