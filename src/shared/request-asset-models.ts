import { SessionMemberStatus, SessionStaticSignal } from '@ash-player-server/service/firestore';

export interface SessionDocument {

  session: {
    id: string;
    host: string;
    started: boolean;
    signal?: SessionStaticSignal|`time:${number}`;
    targetLength: number;
    members: {
      [uid: string]: {
        targetLength?: number;
        status: SessionMemberStatus;
      };
    };
  };

}

export interface InvitationDocument {

  invitation: {
    id: string;
    from: string;
    to: string;
    session: string;
  };

}
