import {
  Router,
  OnInjection,
  route,
  validate,
  Request,
  Response,
  NextFunction
} from '@singular/core';

import { AuthService, DecodedToken } from '@ash-player-server/service/auth';

@Router({
  name: 'auth',
  routes: [
    route.GLOBAL('*', 'authHandler', [
      validate.headers({
        authorization: value => !! value?.match(/^Bearer .+$/) || new Error('Invalid bearer token!')
      })
    ])
  ],
  priority: Infinity
})
export class AuthRouter implements OnInjection {

  private auth: AuthService;

  onInjection(services: any): void {

    this.auth = services.auth;

  }

  async authHandler(req: SecureRequest, res: Response, next: NextFunction) {

    const { uid, email, firebase } = await this.auth.verifyToken(req.header('authorization').match(/^Bearer (?<token>.+)$/).groups.token);

    req.auth = { uid, email, provider: firebase.sign_in_provider };

    next();

  }

}

export interface SecureRequest extends Request {

  auth: DecodedToken;

}
