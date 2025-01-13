import { animate, state, style, transition, trigger } from "@angular/animations";

export const sidebarItemAnimation = trigger('openClose', [
    // ...
    state('open', style({

        opacity: 1,
        // transition: 'ease-out duration-100'
    })),
    state('closed', style({

        opacity: 0,
        // transition: 'ease-in duration-75'
    })),
    transition('open => closed', [
        animate('1s')
    ]),
    transition('closed => open', [
        animate('1s')
    ]),
])

export const asideBarAnimation = trigger('asideBarAnimation', [
    state('open', style({
        opacity: 1,
        transform: 'translateX(0)'
    })),
    state('closed', style({
        opacity: 0,
        transform: 'translateX(-100%)'
    })),
    transition('open => closed', [
        animate('0.2s', style({ transform: 'translateX(-100%)', opacity: 0 })),
    ]),
    transition('closed => open', [
        animate('0.2s', style({ transform: 'translateX(0)', opacity: 1 }))
    ])
])