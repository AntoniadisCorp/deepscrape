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
});
