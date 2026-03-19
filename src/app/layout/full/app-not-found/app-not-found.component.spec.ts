import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotFoundComponent } from './app-not-found.component';
import { getTestProviders } from 'src/app/testing';

describe('AppNotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
