import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CPackComponent } from './cpack.component';
import { getTestProviders } from 'src/app/testing';
import { CrawlPack } from '../../types';
import { Timestamp } from '@angular/fire/firestore';

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

  it('should normalize crawl4ai type for display', () => {
    expect(component.displayPackType('crawl4ai')).toBe('crawler');
    expect(component.displayPackType(undefined)).toBe('crawler');
  });

  it('should keep non-crawl4ai type unchanged', () => {
    expect(component.displayPackType('api')).toBe('api');
  });

  it('should return undefined for non-Timestamp created_at value', () => {
    expect(component.createdAt).toBeUndefined();
  });

  it('should convert Timestamp created_at into Date', () => {
    const created = new Date('2024-05-01T10:20:30.000Z');
    fixture.componentRef.setInput('pack', {
      ...mockPack,
      created_at: Timestamp.fromDate(created),
    } as unknown as CrawlPack);
    fixture.detectChanges();

    expect(component.createdAt?.toISOString()).toBe(created.toISOString());
  });
});
