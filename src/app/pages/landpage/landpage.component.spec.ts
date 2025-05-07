import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandPageComponent } from './landpage.component';

describe('LandpageComponent', () => {
  let component: LandPageComponent;
  let fixture: ComponentFixture<LandPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandPageComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LandPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
