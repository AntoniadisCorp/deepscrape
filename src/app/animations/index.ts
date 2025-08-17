import { animate, group, keyframes, query, state, style, transition, trigger } from "@angular/animations";
export * from './sidebar'
const resetRoute = [
    style({ position: 'relative' }),
    query(
        ':enter, :leave',
        [
            style({
                position: 'fixed', // using absolute makes the scroll get stuck in the previous page's scroll position on the new page
                top: 0, // adjust this if you have a header so it factors in the height and not cause the router outlet to jump as it animates
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
            }),
        ],
        { optional: true }
    ),
]

export const fadeInOutSlideAnimation =
    trigger('routeAnimation', [
        transition('* <=> *', [
            style({ position: 'relative', overflow: 'hidden' }),
            query(':enter, :leave', [
                style({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                })
            ], { optional: true }),
            query(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 })
            ], { optional: true }),
            query(':leave', [
                style({ transform: 'translateX(0%)', opacity: 1 })
            ], { optional: true }),
            group([
                query(':leave', [
                    animate('400ms ease-in-out', style({ transform: 'translateX(-100%)', opacity: 0 }))
                ], { optional: true }),
                query(':enter', [
                    animate('400ms ease-in-out', style({ transform: 'translateX(0%)', opacity: 1 }))
                ], { optional: true })
            ])
        ])
    ]);

export const fadeInOutAnimation =
    trigger('routeAnimation', [
        transition('* => *', [
            ...resetRoute,
            query(':enter', [style({ opacity: 0 })], {
                optional: true,
            }),
            group([
                query(
                    ':leave',
                    [style({ opacity: 1 }), animate('0.2s', style({ opacity: 0 }))],
                    { optional: true }
                ),
                query(
                    ':enter',
                    [style({ opacity: 0 }), animate('0.5s', style({ opacity: 1 }))],
                    { optional: true }
                ),
            ]),
        ]),
    ])

export const slideInModalAnimation = trigger('slideInOut', [
    transition(':enter', [
        style({ transform: 'translate(50%,0%)' }),
        animate('300ms ease-out', style({ transform: 'translate(0%,0%)' }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translate(100%,0%)' }))
    ])
])

export const PopupAnimation = trigger('enableProfileMenu', [

    transition(':enter', [
        style({ opacity: 0, transition: 'ease-out duration-100' }),
        animate('500ms', style({ opacity: 100, transform: 'translateY(0)' })),
    ]),
    transition(':leave', [
        style({ opacity: 100, transition: 'ease-in duration-75' }),
        animate('500ms', style({ opacity: 0, transform: 'translateY(5%)' })),
    ]),
])


export const bounceAnim = trigger('bounceAnimation', [
    transition('* => *', [
        animate(
            '1s',
            keyframes([
                style({ transform: 'translateY(40%)', offset: 0 }),
                style({ transform: 'translateY(0)', offset: 0.5 }),
                style({ transform: 'translateY(40%)', offset: 1 }),
            ])
        )
    ])
]);

export const startSuspendAnimation = trigger('startSuspendAnimation', [
    state('started', style({
        opacity: 1,
        transform: 'scale(1)'
    })),
    state('suspended', style({
        opacity: 1,
        transform: 'scale(1)'
    })),
    transition('suspended => started', [
        style({ opacity: 0, transform: 'scale(1.34)' }), // start state
        animate('500ms ease-in', style({ opacity: 1, transform: 'scale(1)' }))
    ]),
    transition('started => suspended', [
        style({ opacity: 1, transform: 'scale(1.34)' }), // start state
        animate('500ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
    ])
])


export const expandCollapseAnimation = trigger('expandCollapse', [
    state('collapsed', style({

        height: '0px',
        opacity: '0'
    })),
    state('expanded', style({

        height: '*',
        opacity: '1'
    })),
    transition('collapsed => expanded', [
        animate('300ms ease-in-out')
    ]),
    transition('expanded => collapsed', [
        animate('300ms ease-in-out')
    ])
])

export const fadeinCartItems = trigger('fadeinCartItems', [
    state('void', style({ opacity: 0, transform: 'translateY(-20px)' })),
    state('*', style({ opacity: 1, transform: 'translateY(0)' })),
    transition('void => *', [
        animate('300ms ease-in')
    ]),
    transition('* => void', [
        animate('300ms ease-out')
    ])
])
