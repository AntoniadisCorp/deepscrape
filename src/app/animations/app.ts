import { animate, group, keyframes, query, stagger, state, style, transition, trigger, AnimationTriggerMetadata } from "@angular/animations";


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

export const smoothfadeAnimation = trigger('routeChildAnimation', [
  transition('* <=> *', [
    style({ opacity: 0 }),
    animate('500ms ease-in-out', style({ opacity: 1 }))
  ])
])
export const PopupAnimation = trigger('enableProfileMenu', [

    transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px) scale(0.96)', filter: 'blur(6px)' }),
        animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' })),
    ]),
    transition(':leave', [
        style({ opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' }),
        animate('140ms ease-in', style({ opacity: 0, transform: 'translateY(6px) scale(0.98)', filter: 'blur(4px)' })),
    ]),
])

export const listStaggerAnimation = trigger('listStagger', [
    transition('* => *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateY(10px) scale(0.985)' }),
            stagger('70ms', [
                animate('320ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
            ]),
        ], { optional: true }),
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


export const expandCollapseAnimation: AnimationTriggerMetadata = trigger('expandCollapse', [
    state('collapsed', style({
        height: '0px',
        opacity: '0',
        overflow: 'hidden',
        visibility: 'hidden'
    })),
    state('expanded', style({
        height: '*',
        opacity: '1',
        overflow: 'visible',
        visibility: 'visible'
    })),
    transition('collapsed => expanded', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in-out', 
            style({ 
                height: '*',
                opacity: '1',
                visibility: 'visible'
            })
        )
    ]),
    transition('expanded => collapsed', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in-out', 
            style({ 
                height: '0px',
                opacity: '0',
                visibility: 'hidden'
            })
        )
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
    ]),
    // Add transitions between different states (modes)
    transition('* => *', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
    ])
])
