import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppUserLayoutComponent } from './app-user-layout.component';
import { getTestProviders } from 'src/app/testing';

describe('AppUserLayoutComponent', () => {
  let component: AppUserLayoutComponent;
  let fixture: ComponentFixture<AppUserLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppUserLayoutComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppUserLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('openProfileMenu should open directly for user photo target', () => {
    component.showProfileMenu = false;

    component.openProfileMenu({ target: { alt: 'user photo' } });

    expect(component.showProfileMenu).toBeTrue();
  });

  it('openProfileMenu should toggle menu for non-photo trigger', () => {
    component.showProfileMenu = false;

    component.openProfileMenu();
    expect(component.showProfileMenu).toBeTrue();

    component.openProfileMenu();
    expect(component.showProfileMenu).toBeFalse();
  });

  it('onCloseAsideBar should update state and show scrollbar when closed', () => {
    const showScrollSpy = spyOn((component as any).scrollService, 'showScroll');

    component.onCloseAsideBar(true);

    expect(component.closeAsideBar).toBeTrue();
    expect(showScrollSpy).toHaveBeenCalled();
  });

  it('closeProfileMenu should navigate to billing when billing action is selected', () => {
    const navigateSpy = spyOn((component as any).router, 'navigate');
    const event = {
      target: {
        getAttribute: () => 'billing'
      }
    } as unknown as Event;

    component.closeProfileMenu(event, 'user-a');

    expect(component.showProfileMenu).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/billing']);
  });

  it('ngOnDestroy should unsubscribe known subscriptions', () => {
    const logoutSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    const orgLoadSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    const invitationLoadSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    const invitationActionSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    const sizeSub = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    const routerEventSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);

    component.logoutSubscription = logoutSubscription;
    component.orgLoadSubscription = orgLoadSubscription;
    component.invitationLoadSubscription = invitationLoadSubscription;
    component.invitationActionSubscription = invitationActionSubscription;
    component.sizeSub = sizeSub;
    (component as any).routerEventSubscription = routerEventSubscription;

    component.ngOnDestroy();

    expect(logoutSubscription.unsubscribe).toHaveBeenCalled();
    expect(orgLoadSubscription.unsubscribe).toHaveBeenCalled();
    expect(invitationLoadSubscription.unsubscribe).toHaveBeenCalled();
    expect(invitationActionSubscription.unsubscribe).toHaveBeenCalled();
    expect(sizeSub.unsubscribe).toHaveBeenCalled();
    expect(routerEventSubscription.unsubscribe).toHaveBeenCalled();
  });
});
