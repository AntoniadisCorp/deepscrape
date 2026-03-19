import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarComponent } from './app-sidebar.component';
import { getTestProviders } from 'src/app/testing';

describe('AppSidebarComponent', () => {
  let component: AppSidebarComponent;
  let fixture: ComponentFixture<AppSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
