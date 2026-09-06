import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSettingsComponent } from './account.component';
import { getTestProviders } from 'src/app/testing';

describe('AccountSettingsComponent', () => {
  let component: AccountSettingsComponent;
  let fixture: ComponentFixture<AccountSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSettingsComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('routerLink should map account route to /settings root', () => {
    expect(component.routerLink('account')).toEqual(['/settings']);
    expect(component.routerLink('security')).toEqual(['/settings', 'security']);
  });

  it('getAnimationData should read animation key from outlet data', () => {
    const outlet = {
      activatedRouteData: { animation: 'settings-slide' },
    } as any;

    expect(component.getAnimationData(outlet)).toBe('settings-slide');
  });

  it('ngOnDestroy should unsubscribe router subscription', () => {
    const unsubscribeSpy = jasmine.createSpy('unsubscribe');
    (component as any).routeSub = { unsubscribe: unsubscribeSpy };

    component.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
