import { Service } from '@singular/core';
import admin from 'firebase-admin';
import { DecodedToken } from '@ash-player-server/service/auth';

@Service({
  name: 'firestore'
})
export class FirestoreService {

  public async registerUser(token: DecodedToken, name: string) {

    try {

      await admin.firestore().collection('users').doc(token.uid).set({
        name,
        email: token.email,
        lastTimeOnline: Date.now()
      });

    }
    catch (error) {

      throw new ServerError('Could not register user!', 500, error.code);

    }

  }

}
