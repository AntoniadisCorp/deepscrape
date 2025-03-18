import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownCartComponent } from './dropdown-cart.component';

describe('DropdownCartComponent', () => {
  let component: DropdownCartComponent;
  let fixture: ComponentFixture<DropdownCartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownCartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownCartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
