import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtractStrategyComponent } from './extract-strategy.component';

describe('ExtractStrategyComponent', () => {
  let component: ExtractStrategyComponent;
  let fixture: ComponentFixture<ExtractStrategyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtractStrategyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtractStrategyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
