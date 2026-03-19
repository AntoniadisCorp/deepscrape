import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { DropdownComponent } from './dropdown.component';
import { getTestProviders } from 'src/app/testing';

describe('DropdownComponent', () => {
  let component: DropdownComponent;
  let fixture: ComponentFixture<DropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropdownComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropdownComponent);
    component = fixture.componentInstance;
    component.control = new FormControl<{ name: string; code: string } | null>({ name: 'Option 1', code: 'o1' }) as any;
    component.options = [{ name: 'Option 1', code: 'o1' }, { name: 'Option 2', code: 'o2' }];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
