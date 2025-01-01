import { Directive, HostListener } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { GoogleAuthProvider } from "@firebase/auth";

@Directive({
  selector: "[googleSso]",
  standalone: true,
})
export class GoogleSsoDirective {
  constructor(private angularFireAuth: AngularFireAuth) { }
  @HostListener("click")
  async onClick() {

    // do what you want with the credentials, for ex adding them to firestore...
  }
}