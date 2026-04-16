import { TestBed } from '@angular/core/testing';

import { RouteService } from './route.service';
import { GlobalTabs } from '../types';
import { getTestProviders } from 'src/app/testing';

describe('RouteService', () => {
  let service: RouteService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: getTestProviders() });
    service = TestBed.inject(RouteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return inventory tabs', (done) => {
    const mockTabs: GlobalTabs[] = [
      { id: 'tab1', name: 'Tab 1', svg: 'svg1', icon: 'icon1', color: '#fff' },
      { id: 'tab2', name: 'Tab 2', svg: 'svg2', icon: 'icon2', color: '#000' },
    ];

    service.getInventoryTabs(mockTabs).subscribe((tabs) => {
      expect(tabs).toEqual(mockTabs);
      expect(tabs.length).toBe(2);
      done();
    });
  });

  it('should return data passed as argument', (done) => {
    const mockData = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];

    service.getData(mockData).subscribe((data) => {
      expect(data).toEqual(mockData);
      expect(data.length).toBe(2);
      done();
    });
  });

  it('should find tab by id', (done) => {
    const mockTabs: GlobalTabs[] = [
      { id: '1', name: 'Dashboard', svg: 'dash', icon: 'home', color: '#fff' },
      { id: '2', name: 'Settings', svg: 'set', icon: 'settings', color: '#fff' },
      { id: '3', name: 'Profile', svg: 'prof', icon: 'user', color: '#fff' },
    ];

    service.getInventoryTab('2', mockTabs).subscribe((tab) => {
      expect(tab).toBeDefined();
      expect(tab?.id).toBe('2');
      expect(tab?.name).toBe('Settings');
      done();
    });
  });

  it('should handle string id when finding tab', (done) => {
    const mockTabs: GlobalTabs[] = [
      { id: '1', name: 'Tab 1', svg: 'svg1', icon: 'icon1', color: '#fff' },
      { id: '2', name: 'Tab 2', svg: 'svg2', icon: 'icon2', color: '#000' },
    ];

    service.getInventoryTab('2', mockTabs).subscribe((tab) => {
      expect(tab).toBeDefined();
      done();
    });
  });

  it('should return undefined when tab id not found', (done) => {
    const mockTabs: GlobalTabs[] = [
      { id: '1', name: 'Tab 1', svg: 'svg1', icon: 'icon1', color: '#fff' },
      { id: '2', name: 'Tab 2', svg: 'svg2', icon: 'icon2', color: '#000' },
    ];

    service.getInventoryTab('999', mockTabs).subscribe((tab) => {
      expect(tab).toBeUndefined();
      done();
    });
  });

  it('should handle empty tabs array', (done) => {
    const mockTabs: GlobalTabs[] = [];

    service.getInventoryTabs(mockTabs).subscribe((tabs) => {
      expect(tabs).toEqual([]);
      expect(tabs.length).toBe(0);
      done();
    });
  });

  it('should handle empty data array', (done) => {
    const mockData: any[] = [];

    service.getData(mockData).subscribe((data) => {
      expect(data).toEqual([]);
      done();
    });
  });
});
