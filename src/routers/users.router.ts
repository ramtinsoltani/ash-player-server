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
import { MessageResponse } from '@ash-player-server/shared/responses';

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
    ])
  ]
})
export class UsersRouter implements OnInjection {

  private firestore: FirestoreService;

  onInjection(services: any): void {

    this.firestore = services.firestore;

  }

  async registerUser(req: RegisterUserRequest, res: Response) {

    await this.firestore.registerUser(req.auth, req.body.name);
    await res.respond(new MessageResponse('Successfully created user.'));

  }

}

export interface RegisterUserRequest extends SecureRequest {

  body: {
    name: string;
  };

}
