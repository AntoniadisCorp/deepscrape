import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrawlerPackComponent } from './crawlerpack.component';
import { getTestProviders } from 'src/app/testing';

describe('CrawlerPackComponent', () => {
  let component: CrawlerPackComponent;
  let fixture: ComponentFixture<CrawlerPackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrawlerPackComponent],
      providers: getTestProviders(),
    })
      .compileComponents();

    fixture = TestBed.createComponent(CrawlerPackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getObjectKeys returns enumerable keys from an object', () => {
    const keys = component.getObjectKeys({ a: 1, b: 2, c: 3 });

    expect(keys).toEqual(['a', 'b', 'c']);
  });

  it('openDialog sets dialogOpen signal to true', () => {
    expect(component['dialogOpen']()).toBeFalse();

    (component as any).openDialog();

    expect(component['dialogOpen']()).toBeTrue();
  });
});
