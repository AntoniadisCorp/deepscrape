import { Injectable, inject } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
// import { AngularFireDatabase, AngularFireList } from '@angular/fire/compat/database';
import { Auth } from '@angular/fire/auth';
import { Firestore, getFirestore } from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  // item$: Observable<Board[]> | undefined;



  constructor(
    private afAuth: Auth,
    // private db: AngularFirestore
    // private app: FirebaseApp
  ) {

    // this.app = initializeApp(environment.firebaseConfig)
  }


  private getFirestoreInstance(databaseName?: string): string {
    switch (databaseName) {
      case undefined:
      case '':
      case 'default':
        return '(default)'
      case 'auth0':
        return databaseName
      case 'supply':
        return databaseName
      case 'order':
        return databaseName
      case 'easyscrape':
        return databaseName
      default:
        throw new Error('Invalid database name');
    }
  }


  getInstanceDB(databaseName?: string): Firestore {
    // Get Firestore with the specified database name
    return getFirestore(this.afAuth.app, this.getFirestoreInstance(databaseName));
  }


}
