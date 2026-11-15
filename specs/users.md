# Users and login

Users log in to make cartoons. Anyone can watch the cartoons that are shared
with them, and the public cartoons can be watched without logging in. See
[Sharing](sharing.md) for who can see a cartoon.

## Users

- [x] Users are added directly to the database, with a command on the server.
      The app cannot add users.
- [x] Each user has a username and a display name.
- [x] Users edit their own name and reset their password on the
      [profile page](profile.md).
- [x] Passwords are stored as Argon2id hashes (Node's built-in `crypto.argon2`)
      in PHC string format.

## Login

- [x] Users log in with a username and a password.
- [x] A login lasts 90 days from the last use. Logging out ends the session.
- [x] After 10 failed logins with one username, or 30 from one address, the
      server refuses further logins from them for up to 15 minutes. Successful
      logins do not count.
- [x] If the username or the password is wrong, the error doesn't tell which
      one, and the response takes as long for an unknown username as for a known
      one.
- [x] After logging in, the user returns to the page they were on.
- [x] The app has no personal tokens or API keys. The web app authenticates with
      the session cookie only.

## Access

- [ ] A user who is not logged in can watch the public cartoons.
- [x] Only a logged-in user can open the editor, make a cartoon or change one.
- [x] A user can edit only their own cartoons.

## Groups

A group is a set of users, such as a family or a class. A user can share a
cartoon with a group that they belong to.

- [x] Groups and their members are added directly to the database, with a
      command on the server, like users.
- [x] A user can belong to many groups.
- [x] A user can see the names of the groups they belong to.

## Open questions

- Should users be able to make groups and add members in the app?
