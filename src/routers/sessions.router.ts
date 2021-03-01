import {
  Router,
  OnInjection,
  route,
  validate,
  Response
} from '@singular/core';

import { should, is, does } from '@singular/validators';
import { FirestoreService, SessionStaticSignal } from '@ash-player-server/service/firestore';
import { SecureRequest } from '@ash-player-server/router/auth';
import { MessageResponse, SessionIdResponse, SessionMemberStatusResponse } from '@ash-player-server/shared/responses';
import { SessionDocument } from '@ash-player-server/shared/request-asset-models';

@Router({
  name: 'sessions',
  routes: [
    route.POST('/session/create', 'createSession', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        targetLength: should.be.a.non.zero.number
      })
    ]),
    route.POST('/session/update', 'updateSession', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        targetLength: should.be.a.non.zero.number,
        session: should.be.a.non.empty.string
      }),
      // Loads the session document at req.assets.session
      validate.custom(FirestoreService.sessionMemberValidator)
    ]),
    route.POST('/session/signal', 'sendSessionSignal', [
      validate.headers({
        'content-type': should.be.a.string.that.matches(/^application\/json/)
      }),
      validate.body({
        signal: should.be.a.non.empty.string.that.either(
          is.enum(SessionStaticSignal),
          does.match(/^time:\d+$/)
        ),
        signalTime: should.be.a.non.zero.number,
        session: should.be.a.non.empty.string
      }),
      // Loads the session document at req.assets.session
      validate.custom(FirestoreService.sessionHostValidator),
      validate.custom(FirestoreService.sessionSignalValidator)
    ])
  ]
})
export class SessionsRouter implements OnInjection {

  private firestore: FirestoreService;

  onInjection(services: any): void {

    this.firestore = services.firestore;

  }

  async createSession(req: SessionCreateRequest, res: Response) {

    const id = await this.firestore.createSession(req.auth, req.body.targetLength);
    await res.respond(new SessionIdResponse(id));

  }

  async updateSession(req: SessionUpdateRequest, res: Response) {

    const status = await this.firestore.updateSession(req.auth, req.body.targetLength, req.assets);
    await res.respond(new SessionMemberStatusResponse(status));

  }

  async sendSessionSignal(req: SessionSignalRequest, res: Response) {

    await this.firestore.sendSessionSignal(req.body.signal, req.body.signalTime, req.assets);
    await res.respond(new MessageResponse('Signal was sent to all members in the session.'));

  }

}

export interface SessionCreateRequest extends SecureRequest {

  body: {
    /** The total duration of the selected video file. */
    targetLength: number;
  };

}

export interface SessionSignalRequest extends SecureRequest<SessionDocument> {

  body: {
    /** A session signal to send to all members. */
    signal: SessionStaticSignal|`time-${number}`;
    /** A timestamp indicating when the signal was sent from the host client (used for measuring delays.) */
    signalTime: number;
    /** The session ID. */
    session: string;
  };

}

export interface SessionUpdateRequest extends SecureRequest<SessionDocument> {

  body: {
    /** The total duration of the selected video file. */
    targetLength: number;
    /** The session ID. */
    session: string;
  };

}
