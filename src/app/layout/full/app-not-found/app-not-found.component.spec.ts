import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotFoundComponent } from './app-not-found.component';
import { getTestProviders } from 'src/app/testing';

describe('AppNotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isThemeDark should return true when theme storage value is true', () => {
    spyOn((component as any).localStorage, 'getItem').and.returnValue('true');

    expect(component.isThemeDark()).toBeTrue();
  });

  it('ngOnInit should set dark footer color when dark theme is active', () => {
    spyOn(component, 'isThemeDark').and.returnValue(true);

    component.ngOnInit();

    expect(component.footerColor).toBe('dark:bg-[#212121]');
  });

  it('ngOnInit should set light footer color when dark theme is inactive', () => {
    spyOn(component, 'isThemeDark').and.returnValue(false);

    component.ngOnInit();

    expect(component.footerColor).toBe('bg-[#f5f5f5]');
  });
});
