import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppFooterComponent } from './app-footer.component';
import { getTestProviders } from 'src/app/testing';
import { LocalStorage } from 'src/app/core/services';
import { themeStorageKey } from 'src/app/shared';

describe('AppFooterComponent', () => {
  let component: AppFooterComponent;
  let fixture: ComponentFixture<AppFooterComponent>;
  let localStorageMock: jasmine.SpyObj<Storage>;

  beforeEach(async () => {
    localStorageMock = jasmine.createSpyObj('Storage', ['getItem', 'setItem', 'removeItem']);
    localStorageMock.getItem.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AppFooterComponent],
      providers: [...getTestProviders(), { provide: LocalStorage, useValue: localStorageMock }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default footer color based on light theme when no preference is stored', () => {
    localStorageMock.getItem.and.returnValue('false');
    component.color = '';

    component.ngOnInit();

    expect(localStorageMock.getItem).toHaveBeenCalledWith(themeStorageKey);
    expect(component.color).toContain('bg-gray-200');
  });

  it('should default footer color based on dark theme when preference is true', () => {
    localStorageMock.getItem.and.returnValue('true');
    component.color = '';

    component.ngOnInit();

    expect(component.color).toContain('dark:bg');
  });

  it('should preserve explicitly provided color input', () => {
    component.color = 'bg-blue-500';

    component.ngOnInit();

    expect(component.color).toBe('bg-blue-500');
  });
});
