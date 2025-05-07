import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupIntentComponent } from './setupintent.component';

describe('SetupIntentComponent', () => {
  let component: SetupIntentComponent;
  let fixture: ComponentFixture<SetupIntentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupIntentComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SetupIntentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
