import { Service } from '@singular/core';
import admin from 'firebase-admin';
import { DecodedToken } from '@ash-player-server/service/auth';
import { InviteUserRequest, AcceptInviteRequest } from '@ash-player-server/router/users';
import { SessionUpdateRequest, SessionSignalRequest } from '@ash-player-server/router/sessions';

@Service({
  name: 'firestore'
})
export class FirestoreService {

  public static async uidValidator(uid: string): Promise<boolean|Error> {

    try {

      if ( ! (await admin.firestore().collection('users').doc(uid).get()).exists )
        return new Error('User is not fully registered!');

    }
    catch (error) {

      return new Error('An internal error has occurred!');

    }

    return true;

  }

  public static async sessionHostValidator(req: InviteUserRequest|SessionSignalRequest): Promise<boolean|Error> {

    try {

      const session = await admin.firestore().collection('sessions').doc(req.body.session).get();

      if ( ! session.exists ) return new Error('Session does not exist!');

      if ( session.data().host !== req.auth.uid )
        return new Error('Session is not hosted by user!');

      req.assets.session = <any>session.data();
      req.assets.session.id = req.body.session;

    }
    catch (error) {

      return new Error('An internal error has occurred!');

    }

    return true;

  }

  public static async invitationValidator(req: AcceptInviteRequest): Promise<boolean|Error> {

    try {

      const invitation = await admin.firestore().collection('invitations').doc(req.body.id).get();

      if ( ! invitation.exists )
        return new Error('Invitation does not exist!');

      if ( invitation.data().to !== req.auth.uid )
        return new Error('Invitation does not belong to user!');

      req.assets.invitation = <any>invitation.data();
      req.assets.invitation.id = req.body.id;

      const session = await admin.firestore().collection('sessions').doc(invitation.data().session).get();

      if ( ! session.exists )
        return new Error('Session no longer exists!');

      req.assets.session = <any>session.data();
      req.assets.session.id = invitation.data().session;

    }
    catch (error) {

      return new Error('An internal error has occurred!');

    }

    return true;

  }

  public static async sessionMemberValidator(req: SessionUpdateRequest): Promise<boolean|Error> {

    try {

      const session = await admin.firestore().collection('sessions').doc(req.body.session).get();

      if ( ! session.exists ) return new Error('Session does not exist!');

      if ( ! session.data().members.hasOwnProperty(req.auth.uid) )
        return new Error('Could not update session since user is has not been invited!');

      req.assets.session = <any>session.data();
      req.assets.session.id = req.body.session;

    }
    catch (error) {

      return new Error('An internal error has occurred!');

    }

    return true;

  }

  private users = admin.firestore().collection('users');
  private contacts = admin.firestore().collection('contacts');
  private invitations = admin.firestore().collection('invitations');
  private sessions = admin.firestore().collection('sessions');

  public async registerUser(token: DecodedToken, name: string) {

    try {

      await this.users.doc(token.uid).create({
        name,
        email: token.email,
        lastTimeOnline: Date.now()
      });

    }
    catch (error) {

      throw new ServerError('Could not register user!', 500, error.code);

    }

  }

  public async registeredUserGuard(token: DecodedToken) {

    try {

      if ( ! (await this.users.doc(token.uid).get()).exists )
        throw new ServerError('User is not fully registered!', 400, 'auth/user-not-registered');

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async updateUserStatus(token: DecodedToken) {

    try {

      await this.users.doc(token.uid).update({
        lastTimeOnline: Date.now()
      });

    }
    catch (error) {

      throw new ServerError('Could not update user status!', 500, error.code);

    }

  }

  public async inviteUser(token: DecodedToken, to: string, session: string) {

    try {

      await this.invitations.add({
        from: token.uid,
        to,
        session
      });

    }
    catch (error) {

      throw new ServerError('Could not invite user!', 500, error.code);

    }

  }

  public async acceptInvite(token: DecodedToken, assets: AcceptInviteRequest['assets']) {

    try {

      await this.invitations.doc(assets.invitation.id).delete();
      await this.sessions.doc(assets.session.id).update({
        [`members.${token.uid}`]: {
          status: SessionMemberStatus.NotReady
        }
      });

    }
    catch (error) {

      throw new ServerError('Could not accept invitation!', 500, error.code);

    }

  }

  public async deleteUser(token: DecodedToken) {

    try {

      // Delete all invitations sent by this user
      const invitations = await this.invitations.where('from', '==', token.uid).get();

      for ( const invitation of invitations.docs ) {

        await invitation.ref.delete();

      }

      // Delete all sessions hosted by this user
      const sessions = await this.sessions.where('host', '==', token.uid).get();

      for ( const session of sessions.docs ) {

        await session.ref.delete();

      }

      // Delete contacts list
      await this.contacts.doc(token.uid).delete();

      // Delete user document
      await this.users.doc(token.uid).delete();

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async addContact(token: DecodedToken, email: string) {

    try {

      // Look for a user with the given email
      const contacts = await this.users.where('email', '==', email).get();

      if ( ! contacts.size ) throw new ServerError('Email is not registered as a user!');

      // Add contact into list
      await this.contacts.doc(token.uid).update({
        [contacts.docs[0].id]: true
      });

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async deleteContact(token: DecodedToken, uid: string) {

    try {

      await this.contacts.doc(token.uid).update({
        [uid]: null
      });

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async createSession(token: DecodedToken, targetLength: number) {

    try {

      const doc = await this.sessions.add({
        host: token.uid,
        started: false,
        targetLength,
        members: {}
      });

      return doc.id;

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async updateSession(token: DecodedToken, targetLength: number, assets: SessionUpdateRequest['assets']) {

    try {

      await this.sessions.doc(assets.session.id).update({
        [`members.${token.uid}`]: {
          targetLength,
          status: assets.session.targetLength === targetLength ? SessionMemberStatus.Ready : SessionMemberStatus.Mismatch
        }
      });

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async sendSessionSignal(signal: SessionSignalRequest['body']['signal'], assets: SessionSignalRequest['assets']) {

    try {

      await this.sessions.doc(assets.session.id).update({ signal });

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

}

export enum SessionMemberStatus {

  NotReady = 'not-ready',
  Ready = 'ready',
  Mismatch = 'mismatch'

}

export enum SessionStaticSignal {

  Start = 'start',
  Pause = 'pause',
  Resume = 'resume',
  Stop = 'stop',
  End = 'end'

}
