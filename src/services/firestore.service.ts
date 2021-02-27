import { Service, OnInit } from '@singular/core';
import admin from 'firebase-admin';
import { DecodedToken } from '@ash-player-server/service/auth';
import { InviteUserRequest, AcceptInviteRequest, RejectInviteRequest } from '@ash-player-server/router/users';
import { SessionUpdateRequest, SessionSignalRequest } from '@ash-player-server/router/sessions';

@Service({
  name: 'firestore'
})
export class FirestoreService implements OnInit {

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

  public static invitationValidatorWithoutSession(req: RejectInviteRequest): Promise<boolean|Error> {

    return FirestoreService.invitationValidator(<AcceptInviteRequest>req, true);

  }

  public static async invitationValidator(req: AcceptInviteRequest, skipSession?: boolean): Promise<boolean|Error> {

    try {

      const invitation = await admin.firestore().collection('invitations').doc(req.body.id).get();

      if ( ! invitation.exists )
        return new Error('Invitation does not exist!');

      if ( invitation.data().to !== req.auth.uid )
        return new Error('Invitation does not belong to user!');

      req.assets.invitation = <any>invitation.data();
      req.assets.invitation.id = req.body.id;

      if ( skipSession ) return true;

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

  public static async sessionSignalValidator(req: SessionSignalRequest): Promise<boolean|Error> {

    try {

      // End signal is allowed
      if ( req.body.signal === SessionStaticSignal.End ) return true;

      // Other signals require all members to be ready
      for ( const uid in req.assets.session.members ) {

        if ( req.assets.session.members[uid].status !== SessionMemberStatus.Ready )
          return new Error('Session members must be ready!');

      }

    }
    catch (error) {

      return new Error('An internal error has occurred!');

    }

    return true;

  }

  private users: admin.firestore.CollectionReference<admin.firestore.DocumentData>;
  private contacts: admin.firestore.CollectionReference<admin.firestore.DocumentData>;
  private invitations: admin.firestore.CollectionReference<admin.firestore.DocumentData>;
  private sessions: admin.firestore.CollectionReference<admin.firestore.DocumentData>;

  onInit(): void {

    this.users = admin.firestore().collection('users');
    this.contacts = admin.firestore().collection('contacts');
    this.invitations = admin.firestore().collection('invitations');
    this.sessions = admin.firestore().collection('sessions');

  }

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

  public async rejectInvite(assets: RejectInviteRequest['assets']) {

    try {

      await this.invitations.doc(assets.invitation.id).delete();

    }
    catch (error) {

      throw new ServerError('Could not reject invitation!', 500, error.code);

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

      // Create contact list if it doesn't exist
      if ( ! (await this.contacts.doc(token.uid).get()).exists ) {

        await this.contacts.doc(token.uid).create({
          [contacts.docs[0].id]: true
        });

      }
      // Update contact list otherwise
      else {

        await this.contacts.doc(token.uid).update({
          [contacts.docs[0].id]: true
        });

      }

    }
    catch (error) {

      throw new ServerError('Could not add contact!', 500, error.code);

    }

  }

  public async deleteContact(token: DecodedToken, uid: string) {

    try {

      await this.contacts.doc(token.uid).update({
        [uid]: admin.firestore.FieldValue.delete()
      });

    }
    catch (error) {

      throw new ServerError('Could not delete contact!', 500, error.code);

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

      const status = assets.session.targetLength === targetLength ? SessionMemberStatus.Ready : SessionMemberStatus.Mismatch;

      await this.sessions.doc(assets.session.id).update({
        [`members.${token.uid}`]: {
          targetLength,
          status
        }
      });

      return status;

    }
    catch (error) {

      throw new ServerError('An internal error has occurred!', 500, error.code);

    }

  }

  public async sendSessionSignal(signal: SessionSignalRequest['body']['signal'], assets: SessionSignalRequest['assets']) {

    try {

      await this.sessions.doc(assets.session.id).update({ signal });

      if ( signal === 'end' ) await this.sessions.doc(assets.session.id).delete();

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
