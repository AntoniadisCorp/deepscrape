import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiKeysComponent } from './api-keys.component';

describe('ApiKeysComponent', () => {
  let component: ApiKeysComponent;
  let fixture: ComponentFixture<ApiKeysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeysComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApiKeysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
