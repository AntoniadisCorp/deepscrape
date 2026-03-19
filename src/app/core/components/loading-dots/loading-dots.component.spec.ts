import { TestBed } from '@angular/core/testing';
import { LoadingDotsComponent } from './loading-dots.component';
import { getTestProviders } from 'src/app/testing';

describe('LoadingDotsComponent', () => {
  let component: LoadingDotsComponent;
  let fixture: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingDotsComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(LoadingDotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have three dots', () => {
    const dots = fixture.nativeElement.querySelectorAll('.dot');
    expect(dots.length).toBe(3);
  });

  it('starts with flash disabled', () => {
    expect(component.flash).toBeFalse();
  });

  it('should have animation', () => {
    const dots = fixture.nativeElement.querySelectorAll('.dot');
    expect(dots[0].style.animationDelay).toBe('0s');
    expect(dots[1].style.animationDelay).toBe('0.2s');
    expect(dots[2].style.animationDelay).toBe('0.4s');
  });
});