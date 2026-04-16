import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiKeysComponent } from './api-keys.component';
import { getTestProviders } from 'src/app/testing';

describe('ApiKeysComponent', () => {
  let component: ApiKeysComponent;
  let fixture: ComponentFixture<ApiKeysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeysComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiKeysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generateApiKey should open new key popup', () => {
    (component as any).popupNewKeyVisible = false;

    component.generateApiKey();

    expect((component as any).popupNewKeyVisible).toBeTrue();
  });

  it('addApiKey should close popup, set title, and open modal', () => {
    (component as any).popupNewKeyVisible = true;

    component.addApiKey('Personal');

    expect((component as any).popupNewKeyVisible).toBeFalse();
    expect((component as any).keyModalTitle).toBe('Personal');
    expect((component as any).isKeyModalOpen.value).toBeTrue();
  });

  it('clearKeysInput should reset key name and key value controls', () => {
    (component as any).newApiKeyName.setValue('Server Key');
    (component as any).newApiKey.setValue('secret-value');

    component.clearKeysInput();

    expect((component as any).newApiKeyName.value).toBe('');
    expect((component as any).newApiKey.value).toBe('');
  });
});
