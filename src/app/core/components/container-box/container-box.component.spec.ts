import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContainerBoxComponent } from './container-box.component';

describe('ContainerBoxComponent', () => {
  let component: ContainerBoxComponent;
  let fixture: ComponentFixture<ContainerBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContainerBoxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContainerBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
