import { Service, OnInit } from '@singular/core';
import admin from 'firebase-admin';
import firebaseCert from '@ash-player-server/firebase-cert';

@Service({
  name: 'auth',
  priority: Infinity
})
export class AuthService implements OnInit {

  onInit(): void {

    admin.initializeApp({
      credential: admin.credential.cert(<any>firebaseCert),
      databaseURL: 'https://ashplayer-5c0f2-default-rtdb.firebaseio.com'
    });

  }

  public async verifyToken(token: string) {

    try {

      return await admin.auth().verifyIdToken(token);

    }
    catch (error) {

      throw new ServerError('Authentication failed!', 400, error.code);

    }

  }

  public async deleteUser(token: DecodedToken) {

    try {

      await admin.auth().deleteUser(token.uid);

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

}

export interface DecodedToken {

  uid: string;
  email: string;
  provider: string;

}
