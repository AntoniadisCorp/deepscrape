import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { AppSidebarNavComponent } from './app-sidebar-nav.component';
import { getTestProviders } from 'src/app/testing';
import { AuthService, LoadingService } from 'src/app/core/services';

describe('AppSidebarNavComponent', () => {
  let component: AppSidebarNavComponent;
  let fixture: ComponentFixture<AppSidebarNavComponent>;
  let loadingServiceMock: jasmine.SpyObj<LoadingService>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    loadingServiceMock = jasmine.createSpyObj('LoadingService', ['startLoading', 'stopLoading']);
    authServiceMock = jasmine.createSpyObj('AuthService', [], { isAdmin: false });

    await TestBed.configureTestingModule({
      imports: [AppSidebarNavComponent],
      providers: [
        ...getTestProviders(),
        { provide: LoadingService, useValue: loadingServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSidebarNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start loading in constructor and stop after view init delay', fakeAsync(() => {
    expect(loadingServiceMock.startLoading).toHaveBeenCalled();

    component.ngAfterViewInit();
    tick(401);

    expect(loadingServiceMock.stopLoading).toHaveBeenCalled();
  }));

  it('should hide admin navigation when user is not admin', () => {
    Object.defineProperty(authServiceMock, 'isAdmin', { value: false, configurable: true });
    component = new AppSidebarNavComponent(loadingServiceMock, authServiceMock);

    const hasAdmin = (component as any).filteredNavigation.some((item: any) => item?.name === 'Admin');
    expect(hasAdmin).toBe(false);
  });

  it('should show admin navigation when user is admin', () => {
    Object.defineProperty(authServiceMock, 'isAdmin', { value: true, configurable: true });
    component = new AppSidebarNavComponent(loadingServiceMock, authServiceMock);

    const hasAdmin = (component as any).filteredNavigation.some((item: any) => item?.name === 'Admin');
    expect(hasAdmin).toBe(true);
  });

  it('should identify divider and title items correctly', () => {
    expect(component.isDivider({ divider: true })).toBe(true);
    expect(component.isDivider({})).toBe(false);
    expect(component.isTitle({ title: true })).toBe(true);
    expect(component.isTitle({})).toBe(false);
  });
});
