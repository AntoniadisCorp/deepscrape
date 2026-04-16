import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { IfAuthorizedDirective } from './if-authorized.directive';
import { AuthzService } from '../services';
import { getTestProviders } from 'src/app/testing';

@Component({
  selector: 'app-test-if-authorized',
  template: `
    <div *ifAuthorized="permission">
      Authorized Content
    </div>
  `,
  standalone: true,
  imports: [IfAuthorizedDirective],
})
class TestComponent {
  permission = { resource: 'crawl' as const, action: 'execute' as const };
}

describe('IfAuthorizedDirective', () => {
  let authzServiceMock: jasmine.SpyObj<AuthzService>;
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    authzServiceMock = jasmine.createSpyObj('AuthzService', ['can$']);

    await TestBed.configureTestingModule({
      imports: [TestComponent, IfAuthorizedDirective],
      providers: [
        ...getTestProviders(),
        { provide: AuthzService, useValue: authzServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    debugElement = fixture.debugElement;
  });

  it('should show content when authorized', () => {
    authzServiceMock.can$.and.returnValue(of(true));

    fixture.detectChanges();
    const content = debugElement.query(By.css('div'));

    expect(content).toBeTruthy();
    expect(content.nativeElement.textContent).toContain('Authorized Content');
  });

  it('should hide content when not authorized', () => {
    authzServiceMock.can$.and.returnValue(of(false));

    fixture.detectChanges();
    const content = debugElement.query(By.css('div'));

    expect(content).toBeFalsy();
  });

  it('should clear view when permission is null on initial render', () => {
    component.permission = null as any;
    fixture.detectChanges();

    const content = debugElement.query(By.css('div'));
    expect(content).toBeFalsy();
  });

  it('should request authorization for the configured permission', () => {
    authzServiceMock.can$.and.returnValue(of(true));
    component.permission = { resource: 'crawl', action: 'execute' };
    fixture.detectChanges();

    expect(authzServiceMock.can$).toHaveBeenCalledWith('crawl', 'execute', undefined);
  });

  it('should pass permission to authorization check', () => {
    authzServiceMock.can$.and.returnValue(of(true));
    component.permission = {
      resource: 'crawl',
      action: 'execute',
    };

    fixture.detectChanges();

    expect(authzServiceMock.can$).toHaveBeenCalledWith('crawl', 'execute', undefined);
  });
});
