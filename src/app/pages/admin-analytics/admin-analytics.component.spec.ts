import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAnalyticsComponent1 as AdminAnalyticsComponent } from './admin-analytics1.component';
import { getTestProviders } from 'src/app/testing';


describe('AdminAnalyticsComponent', () => {
  let component: AdminAnalyticsComponent;
  let fixture: ComponentFixture<AdminAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAnalyticsComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAnalyticsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize default filter state', () => {
    expect(component.filters.period).toBe('last-7d');
    expect(component.filters.realtime).toBeTrue();
  });

  it('should expose period options including last 7 days', () => {
    const periods = component.periodOptions.map((x) => x.value);

    expect(periods).toContain('last-7d');
    expect(periods.length).toBeGreaterThan(3);
  });

  it('should initialize chart datasets with empty labels', () => {
    expect(component.timelineChartData.labels).toEqual([]);
    expect(component.countryChartData.labels).toEqual([]);
    expect(component.browserChartData.labels).toEqual([]);
  });
});
