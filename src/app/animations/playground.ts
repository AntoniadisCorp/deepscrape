
import { animate, group, keyframes, query, state, style, transition, trigger } from "@angular/animations";

export const fadeInUp = trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
// This is now a duplicate of expandCollapseAnimation from app.ts and should not be used
// Use expandCollapseAnimation from app.ts instead
// export const expandCollapse = trigger('expandCollapse', [
//       state('collapsed', style({ height: '0', opacity: 0, overflow: 'hidden' })),
//       state('expanded', style({ height: '*', opacity: 1, overflow: 'visible' })),
//       transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4,0,0.2,1)'))
//     ])