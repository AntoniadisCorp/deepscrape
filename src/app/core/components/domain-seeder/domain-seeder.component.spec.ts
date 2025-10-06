import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DomainSeederComponent } from './domain-seeder.component';

describe('DomainSeederComponent', () => {
  let component: DomainSeederComponent;
  let fixture: ComponentFixture<DomainSeederComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainSeederComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DomainSeederComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
