// loading-dots.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { LoadingDotsComponent } from './loading-dots.component';

describe('LoadingDotsComponent', () => {
  let component: LoadingDotsComponent;
  let fixture: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoadingDotsComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadingDotsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have three dots', () => {
    const dots = fixture.nativeElement.querySelectorAll('.dot');
    expect(dots.length).toBe(3);
  });

  it('should have animation', () => {
    const dots = fixture.nativeElement.querySelectorAll('.dot');
    expect(dots[0].style.animation).toBeDefined();
    expect(dots[1].style.animationDelay).toBe('0.3s');
    expect(dots[2].style.animationDelay).toBe('0.6s');
  });
});