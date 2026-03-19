import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationsComponent } from './operations.component';
import { getTestProviders } from 'src/app/testing';

describe('OperationsComponent', () => {
  let component: OperationsComponent;
  let fixture: ComponentFixture<OperationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(OperationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
