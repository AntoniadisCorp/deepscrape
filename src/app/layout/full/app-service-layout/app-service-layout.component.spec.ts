import { ComponentFixture, TestBed, inject } from '@angular/core/testing';
import { AppServiceLayoutComponent } from './app-service-layout.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ChildrenOutletContexts, ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Component, InjectionToken } from '@angular/core';
import { LocalStorage, STORAGE_PROVIDERS } from 'src/app/core/services';

const LOCAL_STORAGE = new InjectionToken<Storage>('window.localStorage');

@Component({
  template: '<router-outlet></router-outlet>',
})
class TestRouterComponent { }

describe('AppServiceLayoutComponent', () => {
  let component: AppServiceLayoutComponent;
  let fixture: ComponentFixture<AppServiceLayoutComponent>;
  let router: Router;
  let activatedRoute: ActivatedRoute;
  let contexts: ChildrenOutletContexts;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppServiceLayoutComponent,
        RouterTestingModule.withRoutes([
          {
            path: 'test',
            component: TestRouterComponent,
            data: { animation: 'fade' },
          },
        ]),
        NoopAnimationsModule,
      ],
      providers: [
        ChildrenOutletContexts,
        STORAGE_PROVIDERS,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppServiceLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    activatedRoute = TestBed.inject(ActivatedRoute);
    contexts = TestBed.inject(ChildrenOutletContexts);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* it('should return animation data from getAnimationData', () => {
    router.navigate(['/test']);
    const outlet = contexts.getContext('primary')?.outlet as RouterOutlet;
    const animationData = component.getAnimationData(outlet);
    expect(animationData).toBe('fade');
  });
 
  it('should return undefined if no animation data is present', () => {
    router.navigate(['/']);
    const outlet = contexts.getContext('primary')?.outlet as RouterOutlet;
    const animationData = component.getAnimationData(outlet);
    expect(animationData).toBeUndefined();
  });
 
  it('should call getContext with "primary" when getAnimationData is invoked', () => {
    const getContextSpy = spyOn(contexts, 'getContext').and.callThrough();
    component.getAnimationData(null as any);
    expect(getContextSpy).toHaveBeenCalledWith('primary');
  }); */
});
