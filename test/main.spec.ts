import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import kill from 'tree-kill';
import cert from './firebase-cert.json';
import firebase from 'firebase';

let emulators: ChildProcess, server: ChildProcess;

before('Running Firebase emulators', async function() {

  if ( process.argv.includes('--manual-emulators') ) {

    return console.log('Skipping emulators launch');

  }

  this.timeout(30 * 1000);

  emulators = spawn('firebase', ['emulators:start'], {
    windowsHide: true,
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe'
  });

  console.log('Waiting for emulators to start...');

  await new Promise<void>(resolve => {

    function handler(chunk: any) {

      if ( (chunk + '').includes('All emulators ready! It is now safe to connect your app.') ) {

        emulators.stdout.off('data', handler);
        resolve();

      }

    }

    emulators.stdout.on('data', handler);

  });

  console.log('Emulators started');

});

before('Configuring Firebase and server', async function() {

  // For server port
  process.env.PORT = '5003';

  // For admin SDK in the server
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9098';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

  // For client SDK here in tests
  firebase.initializeApp(cert);
  firebase.firestore().useEmulator('localhost', 9098);
  firebase.auth().useEmulator('http://localhost:9099');

});

before('Running the server', async function() {

  server = spawn('node', ['main.js'], {
    windowsHide: true,
    cwd: path.resolve(__dirname, '..', 'dist'),
    stdio: 'pipe'
  });

  console.log('Waiting for server to start...');

  await new Promise<void>(resolve => {

    function handler(chunk: any) {

      if ( (chunk + '').includes('Server started on port') ) {

        server.stdout.off('data', handler);
        resolve();

      }

    }

    server.stdout.on('data', handler);

  });

  console.log('Server started');

});

import './e2e.spec';

after('Killing all processes', async function() {

  firebase.app().delete();
  kill(server.pid);
  if ( emulators ) kill(emulators.pid);

});
