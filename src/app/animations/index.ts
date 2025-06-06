import { animate, group, keyframes, query, style, transition, trigger } from "@angular/animations";
export * from './sidebar'

export const fadeInOutSlideAnimation =
    trigger('routeAnimation', [
        transition('* <=> *', [
            style({ position: 'relative' }),
            query(':enter, :leave', [
                style({
                    position: 'absolute',
                    width: '100%'
                })
            ], { optional: true }),
            query(':enter', [
                style({ opacity: 0, transform: 'translateX(250px)' })
            ], { optional: true }),
            query(':leave', [
                style({ opacity: 1, transform: 'translateX(0)' })
            ], { optional: true }),
            group([
                query(':enter', [
                    animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
                ], { optional: true }),
                query(':leave', [
                    animate('300ms ease-out', style({ opacity: 0, transform: 'translateX(-250px)' }))
                ], { optional: true })
            ])
        ])
    ])

export const slideInModalAnimation = trigger('slideInOut', [
    transition(':enter', [
        style({ transform: 'translate(100%,-50%)' }),
        animate('300ms ease-out', style({ transform: 'translate(-50%,-50%)' }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translate(100%,-50%)' }))
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
