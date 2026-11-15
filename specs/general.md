# General

- [ ] The app works with touch on an iPad, and with a mouse on a computer.
- [x] The UI is in Finnish and in English. The user can switch the language.
- [ ] Users log in to make cartoons, and each user has their own cartoons. See
      [Users and login](users.md) and [Sharing](sharing.md).

## New versions

If a user adds the web app to the home screen of an iPad, the app resumes from
memory instead of loading again, so it can run an old version long after a
deploy.

- [x] When the web app comes back to the foreground, it checks whether a new
      version has been deployed, and if so, it loads the page again.
- [x] The app checks for a new version only when it comes back to the
      foreground, so that it never loads again while the user is working.
- [x] If the check fails, for example when the device is offline, the app keeps
      running and checks again the next time.

## Open questions

- Should the UI work for users who can't read yet? If so, it needs mostly icons.
