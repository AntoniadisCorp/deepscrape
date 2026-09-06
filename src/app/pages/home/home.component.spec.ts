import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { getTestProviders } from 'src/app/testing';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set landing page footer color', () => {
    component.ngOnInit();

    expect(component.footerColor).toBe('landpage');
  });

  it('isThemeDark should return true when stored theme is true', () => {
    spyOn((component as any).localStorage, 'getItem').and.returnValue('true');

    expect(component.isThemeDark()).toBeTrue();
  });

  it('onWindowScroll should update scroll state from window scroll position', () => {
    (component as any).window.scrollY = 101;
    component.onWindowScroll();
    expect(component.isScrolled).toBeTrue();

    (component as any).window.scrollY = 0;
    component.onWindowScroll();
    expect(component.isScrolled).toBeFalse();
  });
});
