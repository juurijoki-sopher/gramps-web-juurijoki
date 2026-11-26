/*
Texts of the pages for a lost or new password: the "Lost password?" form on
the login page and the page its link opens (/set-password). They follow the
browser's language, Finnish or else English, whatever the language set in
the app, as the person may not be signed in.
*/

const FI = {
  'Lost your password?': 'Unohtuiko salasana?',
  'Enter your username. A link to set a new password will be sent to the e-mail address of the account.':
    'Kirjoita käyttäjätunnuksesi. Tilin sähköpostiosoitteeseen lähetetään linkki, jolla voit asettaa uuden salasanan.',
  Username: 'Käyttäjätunnus',
  'Send the link': 'Lähetä linkki',
  'If the user name exists and has an e-mail address, a link to set a new password has been sent to it. The link is valid for an hour.':
    'Jos käyttäjätunnus on olemassa ja sillä on sähköpostiosoite, siihen on lähetetty linkki uuden salasanan asettamiseen. Linkki on voimassa tunnin.',
  'Back to login': 'Takaisin kirjautumiseen',
  'Enter your username.': 'Kirjoita käyttäjätunnuksesi.',
  'The e-mail could not be sent. Try again later or contact the administrator.':
    'Sähköpostia ei voitu lähettää. Yritä myöhemmin uudelleen tai ota yhteyttä ylläpitäjään.',
  'Password sign-in is turned off on this site.':
    'Salasanalla kirjautuminen on poistettu käytöstä tällä sivustolla.',
  'Too many attempts. Wait a moment and try again.':
    'Liian monta yritystä. Odota hetki ja yritä uudelleen.',
  'Set your password': 'Aseta salasanasi',
  'Set a new password': 'Aseta uusi salasana',
  'Choose a password of at least 8 characters.':
    'Valitse vähintään 8 merkin salasana.',
  'New password': 'Uusi salasana',
  'Repeat the password': 'Toista salasana',
  'Set password': 'Aseta salasana',
  'Your password has been set. You can now log in.':
    'Salasanasi on asetettu. Voit nyt kirjautua sisään.',
  'Log in': 'Kirjaudu sisään',
  'This link has already been used.': 'Tämä linkki on jo käytetty.',
  'This link has expired. Ask for a new link.':
    'Tämä linkki on vanhentunut. Pyydä uusi linkki.',
  'This link is not valid. Ask for a new link.':
    'Tämä linkki ei kelpaa. Pyydä uusi linkki.',
  'The password must be at least 8 characters long.':
    'Salasanassa on oltava vähintään 8 merkkiä.',
  'The passwords do not match.': 'Salasanat eivät täsmää.',
  'No connection to the server. Try again.':
    'Ei yhteyttä palvelimeen. Yritä uudelleen.',
  'Something went wrong on the server. Try again later.':
    'Palvelimella tapahtui virhe. Yritä myöhemmin uudelleen.',
}

// 'fi' for a Finnish browser, 'en' for any other
export function passwordPageLang(languages = navigator.languages) {
  const [first] = languages?.length ? languages : [navigator.language]
  return String(first || '')
    .toLowerCase()
    .startsWith('fi')
    ? 'fi'
    : 'en'
}

// the text in the page's language; %s is replaced by the arguments
export function pwText(lang, text, ...args) {
  const translated = lang === 'fi' ? FI[text] ?? text : text
  let i = 0
  return translated.replace(/%s/g, () => String(args[i++] ?? ''))
}
