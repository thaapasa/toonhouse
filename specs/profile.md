# Profile

A page where a logged-in user edits their own name and resets their password.
The profile page only changes the user who is logged in. See
[Users and login](users.md).

## Access

- [ ] Only logged-in users can open the profile page.
- [ ] The app has a link to the profile page wherever the user is logged in.

## Name

- [ ] User can change their display name. The name cannot be empty.
- [ ] The page shows the username and when the account was created.

## Password

- [ ] The page shows when the password was last reset.
- [ ] User can reset their password. The server generates a random password of
      20 letters and digits and saves it. The page then shows it once, with a
      button that copies it. The user cannot choose the password.
- [ ] User must enter their current password to reset the password.
- [ ] Resetting the password ends the user's other sessions. The current session
      stays.

## Groups

- [ ] The page lists the groups that the user belongs to.
