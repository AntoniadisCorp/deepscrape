import { Pipe, PipeTransform } from '@angular/core';
import { Users } from '../types';

@Pipe({
  name: 'provider',

})
export class ProviderPipe implements PipeTransform {

  transform(value: Users | null, providerId: string, tag: string): string | null {
    if (!value || !value.providerData) {
      return null;
    }
    const provider = value.providerData.find(provider => provider.providerId === providerId)

    switch (tag) {
      case 'displayName':
        return provider?.displayName || null;
      case 'email':
        return provider?.email || null;
      case 'photoURL':
        return value.details?.photoURL || provider?.photoURL || `https://ui-avatars.com/api/?name=${this._handlerName(provider?.displayName || 'An+Ym')}&background=random&size=250`;
      case 'phoneNumber':
        return provider?.phoneNumber || null;
      case 'providerId':
        return provider?.providerId || null;
      case 'uid':
        return provider?.uid || null;
      default:
        return null;
    }
  }

  private _handlerName(fullName: string): string {
    // Split the full name into first name and last name
    const [firstName, lastName] = fullName.split(' ');
    const firstLetterFirstName = firstName?.charAt(0);
    const firstLetterLastName = lastName?.charAt(0);
    return firstLetterFirstName + '+' + firstLetterLastName;

  }

}