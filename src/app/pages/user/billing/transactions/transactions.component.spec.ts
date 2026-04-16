import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionsComponent } from './transactions.component';
import { getTestProviders } from 'src/app/testing';

describe('TransactionsComponent', () => {
  let component: TransactionsComponent;
  let fixture: ComponentFixture<TransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render placeholder copy', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('transactions works!');
  });

  it('should compile as standalone component', () => {
    expect((TransactionsComponent as any).ɵcmp.standalone).toBeTrue();
  });
});
