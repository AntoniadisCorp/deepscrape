import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComponent } from './dashboard.component';
import { getTestProviders } from 'src/app/testing';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply grow class via host binding', () => {
    const host: HTMLElement = fixture.nativeElement;

    expect(host.classList.contains('grow')).toBeTrue();
  });

  it('should render browser component host element', () => {
    const browserHost = fixture.nativeElement.querySelector('app-browser');

    expect(browserHost).toBeTruthy();
  });

  it('fetchData should execute without throwing', () => {
    expect(() => component.fetchData()).not.toThrow();
  });
});
