# General

- [ ] The app works with touch on an iPad, and with a mouse on a computer.
- [x] The UI is in Finnish and in English. The user can switch the language.
- [ ] Users log in to make cartoons, and each user has their own cartoons. See
      [Users and login](users.md) and [Sharing](sharing.md).
- [ ] The app doesn't limit what users make. Users can combine anything in the
      library and place actors anywhere, such as a character walking in the sky.
      The app limits something only for a technical reason.

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
- [x] If the editor has edits that are not saved, the app saves them before it
      loads the new version. If the save fails, the app keeps running and checks
      again the next time.

## Saved data

The format of the saved cartoons changes while the app is being developed, and
the cartoons that users have already made must keep working. Until the first
deploy, the format can change without upgrading the saved cartoons.

- [x] An old version of the web app keeps the data that only a newer version
      knows, such as a new setting, when it saves a cartoon.
- [ ] Cartoons saved with an older version of the app open in the latest
      version.
- [ ] If the server can't upgrade a cartoon to the latest format, the cartoon
      list shows it as broken, and the user can't open it. The other cartoons
      work as before.
- [x] If a version of the web app that knows an older format tries to save a
      cartoon, the server refuses the save, and the web app loads the new
      version. The edits that were not saved can be lost.
- [ ] If an old version of the export client downloads a cartoon, it tells the
      user to update the export client.
