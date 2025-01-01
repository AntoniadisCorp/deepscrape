import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppNotFoundComponent } from './app-not-found.component';

describe('AppNotFoundComponent', () => {
  let component: AppNotFoundComponent;
  let fixture: ComponentFixture<AppNotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppNotFoundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppNotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
