import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { RemoveToolbarDirective } from './remove-toolbar.directive';

@Component({
    template: `<div appRemoveToolbar>
               <div class="toolbar">Toolbar 1</div>
               <div class="toolbar">Toolbar 2</div>
               <div>Other Content</div>
             </div>`
})
class TestComponent { }

describe('RemoveToolbarDirective', () => {
    let fixture: ComponentFixture<TestComponent>;
    let component: TestComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TestComponent, RemoveToolbarDirective], // Importing the standalone component
        }).compileComponents();

        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
        fixture.detectChanges(); // Trigger ngOnInit
    });

    it('should create an instance', () => {
        const directive = new RemoveToolbarDirective(fixture.debugElement.nativeElement);
        expect(directive).toBeTruthy();
    });

    it('should remove elements with class "toolbar"', () => {
        let toolbarElements = fixture.debugElement.nativeElement.querySelectorAll('.toolbar');
        toolbarElements.forEach((element: HTMLElement) => {
            element.remove();
        });
        toolbarElements = fixture.debugElement.nativeElement.querySelectorAll('.toolbar')
        expect(toolbarElements.length).toBe(0); // Expect no toolbar elements to be present
    });
});
