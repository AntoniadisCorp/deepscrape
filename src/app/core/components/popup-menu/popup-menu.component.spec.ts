import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupMenuComponent } from './popup-menu.component';
import { getTestProviders } from 'src/app/testing';

describe('PopupMenuComponent', () => {
  let component: PopupMenuComponent;
  let fixture: ComponentFixture<PopupMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupMenuComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupMenuComponent);
    component = fixture.componentInstance;
    component.popupValue = { id: 'test-key' };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
