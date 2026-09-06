import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserConfigComponent } from './browser-config.component';
import { getTestProviders } from 'src/app/testing';

describe('BrowserConfigComponent', () => {
  let component: BrowserConfigComponent;
  let fixture: ComponentFixture<BrowserConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserConfigComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrowserConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default browser type', () => {
    expect(component.configForm).toBeTruthy();
    expect(component.browserType.value.code).toBe('chromium');
  });

  it('addBrowserProfile should open settings and reset selected profile id', () => {
    (component as any).profileSelectedById = 'profile-1';
    component.configForm.get('title')?.setValue('Custom Profile');

    component.addBrowserProfile();

    expect((component as any).newProfileOpened).toBeTrue();
    expect((component as any).showSettings).toBeTrue();
    expect((component as any).profileSelectedById).toBe('');
    expect(component.configForm.get('title')?.value).toBe('');
  });

  it('getAndFilterConfirmForm should exclude title and created_at', () => {
    component.configForm.get('title')?.setValue('Profile A');
    component.configForm.get('viewportWidth')?.setValue(1200);
    component.configForm.get('viewportWidth')?.markAsDirty();

    const result = component.getAndFilterConfirmForm() as any;

    expect(result.title).toBeUndefined();
    expect(result.created_at).toBeUndefined();
    expect(result.viewportWidth).toBe(1200);
    expect(result.browserType).toBe('chromium');
  });
});
