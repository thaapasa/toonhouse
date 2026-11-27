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
- [x] The command that adds a user generates the password, or accepts any
      password that the developer types, with no rules on length or characters.

## Login

- [x] Users log in with a username and a password.
- [x] A login lasts 90 days from the last use. Each use starts the 90 days
      again, so a login that is used at least once in 90 days never ends. This
      is intended: the login has no absolute lifetime. Logging out or resetting
      the password ends it.
- [x] After 30 failed logins from one address, or 10 with one username from one
      address, the server refuses further logins from that address, or with that
      username from that address, for up to 15 minutes. Successful logins do not
      count. Failed logins from other addresses don't lock the user out.
- [x] The server logs each failed login, each login that the limit refuses, and
      each password check that the limit refuses, with the username and the
      client address. The log never shows the password.
- [x] While a flood of logins fills the memory of the login counter, the server
      refuses new logins until the counts expire, instead of slowing down.
- [x] If the username or the password is wrong, the error doesn't tell which
      one, and the response takes as long for an unknown username as for a known
      one.
- [x] After logging in, the user returns to the page they were on.
- [x] The app has no personal tokens or API keys. The web app authenticates with
      the session cookie only.

## Access

- [x] A user who is not logged in can watch the public cartoons.
- [x] Only a logged-in user can open the editor, make a cartoon or change one.
- [x] A user can edit only their own cartoons.
- [x] A user can have at most 1000 cartoons. The limit protects the disk space
      of the server, because each cartoon can hold up to 10 MB of content and 3
      MB of preview image. Even at the limit, one user can store about 13 GB in
      the worst case. When the user has 1000, the app tells them to delete a
      cartoon before making a new one.

## Groups

A group is a set of users, such as a family or a class. A user can share a
cartoon with a group that they belong to.

- [x] Groups and their members are added directly to the database, with a
      command on the server, like users.
- [x] A user can belong to many groups.
- [x] A user can see the names of the groups they belong to.

## Open questions

- Should users be able to make groups and add members in the app?
