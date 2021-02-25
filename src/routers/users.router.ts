import {
  Router,
  OnInjection,
  route,
  validate,
  Response
} from '@singular/core';

import { should } from '@singular/validators';
import { SecureRequest } from '@ash-player-server/router/auth';
import { FirestoreService } from '@ash-player-server/service/firestore';
import { AuthService } from '@ash-player-server/service/auth';
import { MessageResponse } from '@ash-player-server/shared/responses';
import { SessionDocument, InvitationDocument } from '@ash-player-server/shared/request-asset-models';

@Router({
  name: 'users',
  routes: [
    route.POST('/user/register', 'registerUser', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        name: should.be.a.non.empty.string
      })
    ]),
    route.POST('/user/status', 'updateUserStatus'),
    route.POST('/user/invite', 'inviteUser', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        user: FirestoreService.uidValidator,
        session: should.be.a.non.empty.string
      }),
      // Loads the session document at req.assets.session
      validate.custom(FirestoreService.sessionHostValidator)
    ]),
    route.POST('/user/invite/accept', 'acceptInvite', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        id: should.be.a.non.empty.string
      }),
      // Loads the invitation document at req.assets.invitation
      validate.custom(FirestoreService.invitationValidator)
    ]),
    route.DELETE('/user', 'deleteUser')
  ]
})
export class UsersRouter implements OnInjection {

  private auth: AuthService;
  private firestore: FirestoreService;

  onInjection(services: any): void {

    this.auth = services.auth;
    this.firestore = services.firestore;

  }

  async registerUser(req: RegisterUserRequest, res: Response) {

    await this.firestore.registerUser(req.auth, req.body.name);
    await res.respond(new MessageResponse('Successfully registered user.'));

  }

  async updateUserStatus(req: SecureRequest, res: Response) {

    await this.firestore.updateUserStatus(req.auth);
    await res.respond(new MessageResponse('User status was updated.'));

  }

  async inviteUser(req: InviteUserRequest, res: Response) {

    await this.firestore.inviteUser(req.auth, req.body.user, req.body.session);
    await res.respond(new MessageResponse('User was invited to session.'));

  }

  async acceptInvite(req: AcceptInviteRequest, res: Response) {

    await this.firestore.acceptInvite(req.auth, req.assets);
    await res.respond(new MessageResponse('User was invited to session.'));

  }

  async deleteUser(req: SecureRequest, res: Response) {

    await this.auth.deleteUser(req.auth);
    await this.firestore.deleteUser(req.auth);
    await res.respond(new MessageResponse('User was successfully deleted.'));

  }

}

export interface RegisterUserRequest extends SecureRequest {

  body: {
    /** Currently authenticated user's name. */
    name: string;
  };

}

export interface InviteUserRequest extends SecureRequest {

  body: {
    /** UID of the user to invite. */
    user: string;
    /** ID of the session to invite to. */
    session: string;
  };

}

export interface AcceptInviteRequest extends SecureRequest<SessionDocument & InvitationDocument> {

  body: {
    /** The invitation ID. */
    id: string;
  };

}
