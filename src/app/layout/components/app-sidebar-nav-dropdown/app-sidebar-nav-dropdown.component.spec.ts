import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSidebarNavDropdownComponent } from './app-sidebar-nav-dropdown.component';

describe('AppSidebarNavDropdownComponent', () => {
  let component: AppSidebarNavDropdownComponent;
  let fixture: ComponentFixture<AppSidebarNavDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSidebarNavDropdownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
