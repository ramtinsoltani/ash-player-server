import {
  Router,
  OnInjection,
  route,
  validate,
  Response,
  NextFunction
} from '@singular/core';

import { URL } from 'url';

import { AuthService, DecodedToken } from '@ash-player-server/service/auth';
import { FirestoreService } from '@ash-player-server/service/firestore';
import { Request } from '@ash-player-server/plugin/request-assets';

@Router({
  name: 'auth',
  routes: [
    route.GLOBAL('*', 'authHandler', [
      validate.headers({
        authorization: value => !! value?.match(/^Bearer .+$/) || new Error('Invalid bearer token!')
      })
    ]),
    route.GLOBAL('*', 'registeredUserGuard')
  ],
  priority: Infinity
})
export class AuthRouter implements OnInjection {

  private auth: AuthService;
  private firestore: FirestoreService;

  onInjection(services: any): void {

    this.auth = services.auth;
    this.firestore = services.firestore;

  }

  async authHandler(req: SecureRequest, res: Response, next: NextFunction) {

    log.debug('authHandler::Checking token');

    const { uid, email, firebase } = await this.auth.verifyToken(req.header('authorization').match(/^Bearer (?<token>.+)$/).groups.token);

    req.auth = { uid, email, provider: firebase.sign_in_provider };

    log.debug('authHandler::Token valid');

    next();

  }

  async registeredUserGuard(req: SecureRequest, res: Response, next: NextFunction) {

    log.debug('registeredUserGuard::Checking user registration');

    // Ignore endpoint POST /user/register
    if ( req.method === 'POST' && new URL(req.originalUrl).pathname === '/user/register' ) {

      log.debug('registeredUserGuard::Skipped');
      return next();

    }

    await this.firestore.registeredUserGuard(req.auth);

    log.debug('registeredUserGuard::User is registered');

    next();

  }

}

export interface SecureRequest<T=any> extends Request<T> {

  auth: DecodedToken;

}
