# Ash Player Server

This is a server for the [Ash Player](https://github.com/ramtinsoltani/ash-player), made with [Singular](https://github.com/singularframework) which acts as the middle-man between Firestore database and the client to perform all write operations with proper validation (since Firestore security rules are currently limited and therefore encourage bad data structure and/or weak security).

# Authentication

All secure endpoints require a valid Firebase bearer token to be provided in the `Authorization` header by the client.

# Endpoints

If any of the following requests fail, the response will always be an [ErrorResponse](#errorresponse).

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Path</th>
      <th>Secure</th>
      <th>Body</th>
      <th>Response</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/user/register</td>
      <td align="center">✅</td>
      <td align="center"><a href="#registeruserbody">RegisterUserBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Completes a signup request by registering the authenticated user under the "users" collection.</td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/user/status</td>
      <td align="center">✅</td>
      <td align="center">NA</td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Updates the "lastTimeOnline" field on the user document for the authenticated user.</td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/user/invite</td>
      <td align="center">✅</td>
      <td align="center"><a href="#inviteuserbody">InviteUserBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Sends an invitation to a registered user by creating a document under "invitations" collection.<br>Keep in mind that the authenticated user must be the host of the session the invitation's for.</td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/user/invite/accept</td>
      <td align="center">✅</td>
      <td align="center"><a href="#acceptinvitebody">AcceptInviteBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Accepts an invitation by deleting the document and adding the authenticated user under the "members" field on the corresponding document in "sessions" collection.<br>Keep in mind that the invitation should belong to the authenticated user based on the "to" field.</td>
    </tr>
    <tr>
      <td align="right"><strong>DELETE</strong></td>
      <td>/user</td>
      <td align="center">✅</td>
      <td align="center">NA</td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Deletes the current authenticated user from the app.<br><strong>DANGER: There is no turning back once this endpoint is called.</strong></td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/db/contacts</td>
      <td align="center">✅</td>
      <td align="center"><a href="#addcontactbody">AddContactBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Adds a registered user into the contacts list of the authenticated user by email.</td>
    </tr>
    <tr>
      <td align="right"><strong>DELETE</strong></td>
      <td>/db/contacts</td>
      <td align="center">✅</td>
      <td align="center"><a href="#deletecontactbody">DeleteContactBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Deletes a contact from the authenticated user's contacts list by UID.</td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/session/create</td>
      <td align="center">✅</td>
      <td align="center"><a href="#sessioncreatebody">SessionCreateBody</a></td>
      <td align="center"><a href="#sessionidresponse">SessionIdResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Creates a session with the current authenticated user as the host.</td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/session/signal</td>
      <td align="center">✅</td>
      <td align="center"><a href="#sessionsignalbody">SessionSignalBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Sends a signal to all members in the session.</td>
    </tr>
    <tr>
      <td align="right"><strong>POST</strong></td>
      <td>/session/update</td>
      <td align="center">✅</td>
      <td align="center"><a href="#sessionupdatebody">SessionUpdateBody</a></td>
      <td align="center"><a href="#messageresponse">MessageResponse</a></td>
    </tr>
    <tr>
      <td colspan="5">Updates the length of the selected video file in the session for the current authenticated user (as a member of the session only.)</td>
    </tr>
  </tbody>
</table>

## Response Models

The following models represent every possible type of respond (`content-type: application/json`).

### ErrorResponse

```ts
interface ErrorResponse {
  error: true;
  message: string;
  code: string;
}
```

### MessageResponse

```ts
interface MessageResponse {
  message: string;
}
```

### SessionIdResponse

```ts
interface SessionIdResponse {
  id: string;
}
```

## Body Models

The following models represent all types of request body objects (`content-type: application/json`).

### RegisterUserBody

```ts
interface RegisterUserBody {
  /** Currently authenticated user's name. */
  name: string;
}
```

### InviteUserBody

```ts
interface InviteUserBody {
  /** UID of the user to invite. */
  user: string;
  /** ID of the session to invite to. */
  session: string;
}
```

### AcceptInviteBody

```ts
interface AcceptInviteBody {
  /** The invitation ID. */
  id: string;
}
```

### AddContactBody

```ts
interface AddContactBody {
  /** Email of a registered user. */
  email: string;
}
```

### DeleteContactBody

```ts
interface DeleteContactBody {
  /** UID of a registered user. */
  uid: string;
}
```

### SessionCreateBody

```ts
interface SessionCreateBody {
  /** The total duration of the selected video file. */
  targetLength: number;
}
```

### SessionSignalBody

```ts
interface SessionSignalBody {
  /** A session signal to send to all members. */
  signal: 'start'|'pause'|'resume'|'stop'|`time:${number}`|'end';
  /** The session ID. */
  session: string;
}
```

### SessionUpdateBody

```ts
interface SessionUpdateBody {
  /** The total duration of the selected video file. */
  targetLength: number;
  /** The session ID. */
  session: string;
}
```

# Setup

  1. Generate a service account for the Firebase project and save it at `/src/firebase-cert.json`
  2. Install `@singular/cli` globally

# Launching

```bash
npm start
```

# Building

```bash
npm run build
```

# Tests

The following steps are necessary in order to setup tests:
  1. Install `firebase-tools` globally (`npm install -g firebase-tools`)
  2. Create file `.firebaserc` with the following content (replace `FIREBASE_PROJECT_ID` with your firebase project id):
      ```json
      {
        "projects": {
          "default": "FIREBASE_PROJECT_ID"
        }
      }
      ```
  3. Save a copy of your Firebase web credentials (same as in [AshPlayer Client](https://github.com/ramtinsoltani/ash-player)) at `/test/firebase-cert.json`

Once done, the following command will run build the server, run Firebase emulators, and start the tests:

```bash
npm test
```

# Hosting

A `Procfile` is provided for hosting on Heroku. However, the server build can be hosted anywhere and is not limited to any services.
