import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarNavLinkComponent } from './app-sidebar-nav-link.component';

describe('AppSidebarNavLinkComponent', () => {
  let component: AppSidebarNavLinkComponent;
  let fixture: ComponentFixture<AppSidebarNavLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarNavLinkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
