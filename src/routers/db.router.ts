import {
  Router,
  OnInjection,
  route,
  validate,
  transform,
  Response
} from '@singular/core';

import { should } from '@singular/validators';
import { pipe } from '@singular/pipes';
import { FirestoreService } from '@ash-player-server/service/firestore';
import { SecureRequest } from '@ash-player-server/router/auth';
import { MessageResponse } from '@ash-player-server/shared/responses';

@Router({
  name: 'db',
  routes: [
    route.POST('/db/contacts', 'addContact', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        email: should.be.a.valid.email
      }),
      transform.body({
        email: pipe.lowercase.trim
      })
    ]),
    route.DELETE('/db/contacts', 'deleteContact', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        uid: should.be.a.non.empty.string
      })
    ])
  ]
})
export class DbRouter implements OnInjection {

  private firestore: FirestoreService;

  onInjection(services: any): void {

    this.firestore = services.firestore;

  }

  async addContact(req: AddContactRequest, res: Response) {

    await this.firestore.addContact(req.auth, req.body.email);
    await res.respond(new MessageResponse('User was added to contacts.'));

  }

  async deleteContact(req: DeleteContactRequest, res: Response) {

    await this.firestore.deleteContact(req.auth, req.body.uid);
    await res.respond(new MessageResponse('User was added to contacts.'));

  }

}

export interface AddContactRequest extends SecureRequest {

  body: {
    /** Email of a registered user. */
    email: string;
  };

}

export interface DeleteContactRequest extends SecureRequest {

  body: {
    /** UID of a registered user. */
    uid: string;
  };

}
