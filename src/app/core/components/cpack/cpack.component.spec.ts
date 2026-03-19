import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CPackComponent } from './cpack.component';
import { getTestProviders } from 'src/app/testing';
import { CrawlPack } from '../../types';

describe('CPackComponent', () => {
  let component: CPackComponent;
  let fixture: ComponentFixture<CPackComponent>;
  const mockPack: CrawlPack = {
    id: 'pack-1',
    uid: 'user-1',
    title: 'Pack 1',
    type: 'crawl4ai',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    config: {
      type: ['crawler'],
      value: {},
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CPackComponent],
      providers: getTestProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(CPackComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pack', mockPack);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should normalize crawl4ai type for display', () => {
    expect(component.displayPackType('crawl4ai')).toBe('crawler');
    expect(component.displayPackType(undefined)).toBe('crawler');
  });

  it('should return undefined for non-Timestamp created_at value', () => {
    expect(component.createdAt).toBeUndefined();
  });
});
