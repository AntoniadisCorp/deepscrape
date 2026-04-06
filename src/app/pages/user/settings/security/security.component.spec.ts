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
});
