import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipComponent } from './tooltip.component';
import { getTestProviders } from 'src/app/testing';

describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TooltipComponent],
      providers: getTestProviders(),
    }).compileComponents();
    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with visible false and animationState hidden', () => {
    expect(component.visible).toBeFalse();
    expect(component.animationState).toBe('hidden');
  });

  it('setVisibility(true) sets visible and animationState to visible', () => {
    component.setVisibility(true);
    expect(component.visible).toBeTrue();
    expect(component.animationState).toBe('visible');
  });

  it('setVisibility(false) sets visible to false and animationState to hidden', () => {
    component.setVisibility(true);
    component.setVisibility(false);
    expect(component.visible).toBeFalse();
    expect(component.animationState).toBe('hidden');
  });
});
