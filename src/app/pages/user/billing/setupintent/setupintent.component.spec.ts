import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupintentComponent } from './setupintent.component';

describe('SetupintentComponent', () => {
  let component: SetupintentComponent;
  let fixture: ComponentFixture<SetupintentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupintentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupintentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
