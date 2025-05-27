import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpackComponent } from './cpack.component';

describe('CpackComponent', () => {
  let component: CpackComponent;
  let fixture: ComponentFixture<CpackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CpackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CpackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
