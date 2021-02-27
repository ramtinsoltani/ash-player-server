import { SessionMemberStatus } from '@ash-player-server/service/firestore';

export class MessageResponse {

  constructor(public message: string) { }

}

export class SessionIdResponse {

  constructor(public id: string) { }

}

export class SessionMemberStatusResponse {

  constructor(public status: SessionMemberStatus) { }

}
