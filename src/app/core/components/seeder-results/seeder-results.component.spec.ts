import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeederResultsComponent } from './seeder-results.component';

describe('SeederResultsComponent', () => {
  let component: SeederResultsComponent;
  let fixture: ComponentFixture<SeederResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeederResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeederResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
