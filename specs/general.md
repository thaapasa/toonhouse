# General

- [ ] The app works in Chrome, with touch on an iPad or an Android tablet, and
      with a mouse on a computer.
- [ ] One user can't use up the disk, the memory or the processor of the server,
      either with what they store or with a single request, so that the app can
      open for free signup. The limits of the content, such as the cartoon limit
      in [Users and login](users.md), cover the storage now. A feature that lets
      users upload files needs its own limits. This requirement doesn't cover a
      flood of requests, because rate limits are a [free choice](#free-choices).
- [ ] The server log shows what happened, in one or a few lines for each API
      call. A call that the app makes often, such as a poll, can stay out of the
      log.
- [x] The UI is in Finnish and in English. The user can switch the language.
- [ ] Users log in to make cartoons, and each user has their own cartoons. See
      [Users and login](users.md) and [Sharing](sharing.md).
- [ ] The app doesn't limit what users make. Users can combine anything in the
      library and place actors anywhere, such as a character walking in the sky.
      The app limits something only for a technical reason.
- [x] Tests cover the renderer, because a bug there breaks the saved cartoons.

## Security

[Users and login](users.md) has the rules for the login, and
[Sharing](sharing.md) has the rules for who can see a cartoon.

- [ ] The app guards against flaws that a single request can exploit, such as
      injection, cross-site scripting (XSS), path traversal, cross-site request
      forgery (CSRF), and ways around the login or the sharing rules.

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
- [ ] Tests cover the upgrades of the cartoon format, because a bug there breaks
      the saved cartoons.

## Not required

Toonhouse is a hobby app with few users. The items here are decisions, not gaps.
Agents don't build guards for them, and reviews don't raise them. If one becomes
a real problem, the owner fixes it then.

### Attacks by volume

The app doesn't defend against attackers with many resources, such as a botnet,
a distributed denial-of-service (DDoS) attack or an attacker with many
addresses.

### Uptime and bugs

The app keeps the saved cartoons safe, as [Saved data](#saved-data) and
[Deployment](deployment.md) describe. The service itself makes no promises:

- The app makes no promise to stay up. There is no service level agreement
  (SLA). The app runs when it works, and the owner can take it down at any time.
- The app can be down during a deploy.
- A bug in production, even one that stops the service, gets fixed when someone
  finds it. The app doesn't need monitoring, alerts, or code that guards against
  such bugs.

### Devices and browsers

- The app needs to work only in Chrome. If a small change makes it work in
  another major browser, such as Safari or Firefox, an agent can make it. The
  agent doesn't test the change in that browser or write tests for it.
- The app doesn't support screen readers or use with only a keyboard. The colors
  need only to be easy to read for people with normal sight.
- The app doesn't work offline, apart from the saver, which keeps the edits
  through a lost connection.

### Speed

The app has no targets for the frame rate, the load time or the size of the
bundle. If it works well on the owner's devices, it's fast enough. Agents don't
optimize before a slow case shows up.

### Developer tools

The [character studio](studio.md) and the motion prototypes are tools for the
developer. They need no polish, no translations and no work beyond what the
owner asks for.

### Rare cases in the saver

The editor saves the edits by itself, as [Scenes](scenes.md) describes. It keeps
the edits through the common failures: a save that fails or whose answer is
lost, going offline, closing the page or switching to another app, a lost login,
and a conflict with a save from another window or device.

The saver doesn't guard against rare cases. Code that handles them would be
harder to read and to maintain, and simple code matters more here. In these
cases, the user can lose edits:

- The user edits the same cartoon in several tabs or windows of the same browser
  at the same time.
- A new version of the app is deployed while the user edits. This includes edits
  that the browser kept in an older format.
- The browser tab crashes while it is in view.

## Free choices

- The details of the UI that the [design](../design/) doesn't show, such as
  transitions, spacing and icons. Agents can suggest changes to the design too.
- The code's internals, such as the API between the web app and the server, the
  database schema and the split into packages. They follow good practices of
  software architecture, and they keep to the rules of
  [Saved data](#saved-data). The owner asks for changes when needed.
- What the server logs, within the log requirement above, and the wording of the
  log messages.
- Where the expected errors get their translated text. One simple way is that
  the server sends a code for each expected error, and the web app translates
  the code.
- Rate limits, apart from the login limit in [Users and login](users.md). The
  app doesn't need limits on other requests.
- How much of the code the tests cover, beyond the tests of the renderer and the
  upgrades of the cartoon format.
