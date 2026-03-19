import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropdownCartComponent } from './dropdown-cart.component';
import { getTestProviders } from 'src/app/testing';

describe('DropdownCartComponent', () => {
  let component: DropdownCartComponent;
  let fixture: ComponentFixture<DropdownCartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownCartComponent],
      providers: getTestProviders(),
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
