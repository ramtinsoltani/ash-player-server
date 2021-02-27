import { expect } from 'chai';
import got from 'got';
import { Response } from 'got';
import firebase from 'firebase';

const backend = got.extend({
  prefixUrl: 'http://localhost:5003',
  responseType: 'json',
  hooks: {
    'beforeError': [error => {

      const response: Response<any> = error.response;

      if ( response && response.body && response.body.error ) {

        error.name = 'ServerError';
        error.message = response.body.message;
        error.code = response.body.code;

      }

      return error;

    }]
  }
});

async function login(username: 'ramtin'|'ashkan'|'ashktin'): Promise<string> {

  const user = (await firebase.auth().signInWithEmailAndPassword(
    username === 'ramtin' ? 'ramtin@email.com' :
    (username === 'ashkan' ? 'ashkan@email.com' : 'ashktin@email.com'),
    'P@ssword123'
  )).user;

  return await user.getIdToken();

}

function getError(promise: Promise<any>): Promise<Error> {

  return new Promise<Error>((resolve, reject) => {

    promise
    .then(() => reject(new Error('Promise was not rejected!')))
    .catch(resolve);

  });

}

describe('E2E', function() {

  let lastTest: Mocha.Test;
  let sessionId: string;

  beforeEach(function() {

    if ( lastTest && (lastTest.isFailed() || lastTest.isPending()) )
      this.currentTest.skip();

  });

  afterEach(function() {

    lastTest = this.currentTest;

  });

  it('should register users', async function() {

    this.timeout(10000);

    await firebase.auth().createUserWithEmailAndPassword('ramtin@email.com', 'P@ssword123');
    await backend.post('user/register', {
      headers: { 'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}` },
      json: { name: 'Ramtin Soltani' }
    });

    await firebase.auth().createUserWithEmailAndPassword('ashkan@email.com', 'P@ssword123');
    await backend.post('user/register', {
      headers: { 'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}` },
      json: { name: 'Ashkan Ashkpour' }
    });

    await firebase.auth().createUserWithEmailAndPassword('ashktin@email.com', 'P@ssword123');
    await backend.post('user/register', {
      headers: { 'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}` },
      json: { name: 'Ashkan & Ramtin' }
    });

  });

  it('should fail to register existing users', async function() {

    const error = await getError(backend.post('user/register', {
      headers: { 'Authorization': `Bearer ${await login('ramtin')}` },
      json: { name: 'Jacob Soltani' }
    }));

    expect(error).not.to.be.undefined;

  });

  it('should update user status', async function() {

    await backend.post('user/status', {
      headers: { 'Authorization': `Bearer ${await login('ramtin')}` }
    });

  });

  it('should add other users to contacts list', async function() {

    await backend.post('db/contacts', {
      headers: { 'Authorization': `Bearer ${await login('ramtin')}` },
      json: { email: 'ashkan@email.com' }
    });

    await backend.post('db/contacts', {
      headers: { 'Authorization': `Bearer ${await login('ramtin')}` },
      json: { email: 'ashktin@email.com' }
    });

  });

  it('should create session and invite everyone', async function() {

    const token = await login('ramtin');

    // Create a session
    const response = await backend.post<any>('session/create', {
      headers: { 'Authorization': `Bearer ${token}` },
      json: { targetLength: 100 }
    });

    expect(response.body.id).to.be.not.undefined;

    sessionId = response.body.id;

    // Read contacts list
    const contacts = await firebase.firestore()
    .collection('contacts')
    .doc(firebase.auth().currentUser.uid)
    .get();

    for ( const uid in contacts.data() ) {

      await backend.post('user/invite', {
        headers: { 'Authorization': `Bearer ${token}` },
        json: { session: sessionId, user: uid }
      });

    }

  });

  it('should accept all invitations and update session', async function() {

    // Login as ashkan
    let ashkanToken = await login('ashkan');

    // Get all invitations
    let invitations = await firebase.firestore().collection('invitations')
    .where('to', '==', firebase.auth().currentUser.uid)
    .get();

    expect(invitations.size).to.equal(1);

    // Reject invitation
    await backend.post('user/invite/reject', {
      headers: { 'Authorization': `Bearer ${ashkanToken}` },
      json: { id: invitations.docs[0].id }
    });

    invitations = await firebase.firestore().collection('invitations')
    .where('to', '==', firebase.auth().currentUser.uid)
    .get();

    expect(invitations.size).to.equal(0);

    // Re-invite
    const ashkanUid = firebase.auth().currentUser.uid;
    const ramtinToken = await login('ramtin');

    await backend.post('user/invite', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, user: ashkanUid }
    });

    // Login as ashkan
    ashkanToken = await login('ashkan');

    invitations = await firebase.firestore().collection('invitations')
    .where('to', '==', firebase.auth().currentUser.uid)
    .get();

    // Accept invitation
    await backend.post('user/invite/accept', {
      headers: { 'Authorization': `Bearer ${ashkanToken}` },
      json: { id: invitations.docs[0].id }
    });

    // Read session (should fail)
    const error = await getError(firebase.firestore().collection('sessions').doc(invitations.docs[0].data().session).get());

    expect((<any>error).code).to.equal('permission-denied');

    // Update status
    let response = await backend.post<any>('session/update', {
      headers: { 'Authorization': `Bearer ${ashkanToken}` },
      json: { targetLength: 100, session: invitations.docs[0].data().session }
    });

    expect(response.body.status).to.equal('ready');

    // Read session (should pass)
    const session = await firebase.firestore().collection('sessions').doc(invitations.docs[0].data().session).get();

    expect(session.data().targetLength).to.equal(100);

    // Login as ashktin
    const ashktinToken = await login('ashktin');

    // Get all invitations
    invitations = await firebase.firestore().collection('invitations')
    .where('to', '==', firebase.auth().currentUser.uid)
    .get();

    expect(invitations.size).to.equal(1);

    // Accept invitation
    await backend.post('user/invite/accept', {
      headers: { 'Authorization': `Bearer ${ashktinToken}` },
      json: { id: invitations.docs[0].id }
    });

    // Update session with mismatched target length
    response = await backend.post<any>('session/update', {
      headers: { 'Authorization': `Bearer ${ashktinToken}` },
      json: { targetLength: 90, session: invitations.docs[0].data().session }
    });

    expect(response.body.status).to.equal('mismatch');

  });

  it('should manage sending signals in a session', async function() {

    this.timeout(60000);

    // Login as ramtin
    let ramtinToken = await login('ramtin');

    // Send signal (should fail)
    const error = await getError(backend.post('session/signal', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, signal: 'start' }
    }));

    expect((<any>error).code).to.equal('VALIDATION_FAILED');

    // Login as ashktin
    const ashktinToken = await login('ashktin');

    // Update session
    const response = await backend.post<any>('session/update', {
      headers: { 'Authorization': `Bearer ${ashktinToken}` },
      json: { targetLength: 100, session: sessionId }
    });

    expect(response.body.status).to.equal('ready');

    // Login as ramtin
    ramtinToken = await login('ramtin');

    // Listen to session signal
    const signals: string[] = [];
    let sessionEnded: boolean;

    const unsubscribe = firebase.firestore().collection('sessions').doc(sessionId)
    .onSnapshot(doc => {

      if ( ! doc.exists ) {

        sessionEnded = true;
        return;

      }

      if ( doc.data().signal ) signals.push(doc.data().signal);

    });

    // Send signal on session
    await backend.post('session/signal', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, signal: 'start' }
    });

    await backend.post('session/signal', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, signal: 'pause' }
    });

    await backend.post('session/signal', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, signal: 'time:210' }
    });

    await backend.post('session/signal', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, signal: 'resume' }
    });

    // Wait for a second
    await new Promise<void>(resolve => setTimeout(resolve, 1000));

    expect(signals).to.deep.equal([
      'start',
      'pause',
      'time:210',
      'resume'
    ]);

    // End the session
    await backend.post('session/signal', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` },
      json: { session: sessionId, signal: 'end' }
    });

    // Wait for a second
    await new Promise<void>(resolve => setTimeout(resolve, 1000));

    expect(signals).to.deep.equal([
      'start',
      'pause',
      'time:210',
      'resume',
      'end'
    ]);

    expect(sessionEnded).to.be.true;

    unsubscribe();

  });

  it('should delete contacts', async function() {

    const ramtinToken = await login('ramtin');

    // Read contacts
    let contacts = await firebase.firestore()
    .collection('contacts')
    .doc(firebase.auth().currentUser.uid)
    .get();

    for ( const uid in contacts.data() ) {

      await backend.delete('db/contacts', {
        headers: { 'Authorization': `Bearer ${ramtinToken}` },
        json: { uid }
      });

    }

    contacts = await firebase.firestore()
    .collection('contacts')
    .doc(firebase.auth().currentUser.uid)
    .get();

    expect(contacts.data()).to.deep.equal({});

  });

  it('should delete all users', async function() {

    const ramtinToken = await login('ramtin');

    await backend.delete('user', {
      headers: { 'Authorization': `Bearer ${ramtinToken}` }
    });

    const ashkanToken = await login('ashkan');

    await backend.delete('user', {
      headers: { 'Authorization': `Bearer ${ashkanToken}` }
    });

    const ashktinToken = await login('ashktin');

    await backend.delete('user', {
      headers: { 'Authorization': `Bearer ${ashktinToken}` }
    });

  });

});
