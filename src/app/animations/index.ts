import { animate, group, query, style, transition, trigger } from "@angular/animations";

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
