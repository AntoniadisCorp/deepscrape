import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromptareaComponent } from './promptarea.component';

describe('PromptareaComponent', () => {
  let component: PromptareaComponent;
  let fixture: ComponentFixture<PromptareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromptareaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromptareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
