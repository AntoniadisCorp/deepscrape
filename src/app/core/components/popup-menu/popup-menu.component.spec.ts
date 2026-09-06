import { TestBed } from '@angular/core/testing';
import { PopupMenuComponent } from './popup-menu.component';
import { ApiKeyService } from '../../services';
import { ApiKey } from '../../types';
import { getTestProviders } from 'src/app/testing';

describe('PopupMenuComponent', () => {
  let component: PopupMenuComponent;
  let apiKeyService: ApiKeyService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    TestBed.runInInjectionContext(() => {
      component = new PopupMenuComponent();
    });
    apiKeyService = TestBed.inject(ApiKeyService);
  });

  it('setMenuInvisible delegates to ApiKeyService.setMenuInVisible with the popupValue', () => {
    const mockKey = { id: 'key-123' } as ApiKey;
    component.popupValue = mockKey;
    spyOn(apiKeyService, 'setMenuInVisible');
    component.setMenuInvisible();
    expect(apiKeyService.setMenuInVisible).toHaveBeenCalledWith(mockKey);
  });

  it('setMenuInvisible forwards the current popupValue on each call', () => {
    spyOn(apiKeyService, 'setMenuInVisible');
    const firstKey = { id: 'first' } as ApiKey;
    const secondKey = { id: 'second' } as ApiKey;

    component.popupValue = firstKey;
    component.setMenuInvisible();
    component.popupValue = secondKey;
    component.setMenuInvisible();
    expect(apiKeyService.setMenuInVisible).toHaveBeenCalledWith(firstKey);
    expect(apiKeyService.setMenuInVisible).toHaveBeenCalledWith(secondKey);
  });
});
