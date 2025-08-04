import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CrawlPack, Users } from '../../types';
import { AsyncPipe, DatePipe, NgFor } from '@angular/common';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService, FirestoreService } from '../../services';
import { Observable } from 'rxjs/internal/Observable';
import { from } from 'rxjs/internal/observable/from';
import { catchError } from 'rxjs/internal/operators/catchError';
import { throwError } from 'rxjs/internal/observable/throwError';
import { ProviderPipe } from '../../pipes';
import { ImageSrcsetDirective } from '../../directives';


@Component({
  selector: 'app-cpack',
  imports: [DatePipe, NgFor, ProviderPipe, AsyncPipe, ImageSrcsetDirective],
  templateUrl: './cpack.component.html',
  styleUrl: './cpack.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CPackComponent {

  fireService = inject(FirestoreService)
  pack = input.required<CrawlPack>()

  user$: Observable<Users | null>

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.user$ = from(this.fireService.getUserData(this.pack().uid)).pipe(
      catchError((err) => {
        console.log(err)
        return throwError(() => err)
      }
      ))
  }
  get createdAt(): Date | undefined {
    const createdAt = this.pack().created_at;
    if (createdAt instanceof Timestamp) {
      return createdAt.toDate();
    }
    return undefined;
  }

}
