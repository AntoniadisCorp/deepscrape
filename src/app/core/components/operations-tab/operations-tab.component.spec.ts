import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationsTabComponent } from './operations-tab.component';
import { getTestProviders } from 'src/app/testing';

describe('OperationsTabComponent', () => {
  let component: OperationsTabComponent;
  let fixture: ComponentFixture<OperationsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsTabComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
