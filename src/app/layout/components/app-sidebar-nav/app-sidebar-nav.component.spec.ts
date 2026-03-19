import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarNavComponent } from './app-sidebar-nav.component';
import { getTestProviders } from 'src/app/testing';

describe('AppSidebarNavComponent', () => {
  let component: AppSidebarNavComponent;
  let fixture: ComponentFixture<AppSidebarNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarNavComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
