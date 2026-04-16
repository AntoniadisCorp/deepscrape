import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecurityTabComponent } from './security.component';
import { getTestProviders } from 'src/app/testing';

describe('SecurityTabComponent', () => {
  let component: SecurityTabComponent;
  let fixture: ComponentFixture<SecurityTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityTabComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecurityTabComponent);
    component = fixture.componentInstance;
    spyOn(component as any, 'initRecaptcha').and.stub();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize security form with disabled email control', () => {
    expect(component.securityForm).toBeTruthy();
    expect(component.email?.disabled).toBeTrue();
  });

  it('should initialize loading flags to false', () => {
    expect(component.loading.github).toBeFalse();
    expect(component.loading.google).toBeFalse();
    expect(component.loading.password).toBeFalse();
  });

  it('password control should be available for validation workflow', () => {
    expect(component.password).toBeTruthy();
    expect(component.password?.value).toBe('');
  });
});
