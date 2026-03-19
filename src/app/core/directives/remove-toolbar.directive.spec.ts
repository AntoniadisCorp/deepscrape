import { RemoveToolbarDirective } from './remove-toolbar.directive';

describe('RemoveToolbarDirective', () => {
    let host: HTMLElement;
    let directive: RemoveToolbarDirective;

    beforeEach(() => {
        host = document.createElement('div');
        host.innerHTML = `
            <div class="toolbar">Toolbar 1</div>
            <div class="toolbar">Toolbar 2</div>
            <div class="content">Other Content</div>
        `;

        directive = new RemoveToolbarDirective({ nativeElement: host } as any);
    });

    it('should remove toolbar elements on init', () => {
        directive.ngOnInit();
        const toolbarElements = host.querySelectorAll('.toolbar');
        expect(toolbarElements.length).toBe(0);
    });

    it('should keep non-toolbar content', () => {
        directive.ngOnInit();
        expect(host.textContent).toContain('Other Content');
    });
});
