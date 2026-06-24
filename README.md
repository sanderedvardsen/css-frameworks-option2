# CSS Frameworks CA — Option 2 Social app

## Introduksjon
En enkel sosial-app-prototype laget med Bootstrap + Sass. Frontend-only demo: auth, feed, profile, opplasting av profilbilde og thumbnails. Data lagres i `localStorage`.

## Kjøre lokalt
1. `git clone <repo-url>`
2. `cd <repo>`
3. `npm install`
4. `npm run dev`   # Sass watch
5. Åpne `public/index.html` i Live Server.



## Kommentarer for sensor
- Bootstrap er installert via npm (ingen CDN).
- Skjemaer har HTML-validering (`required`, `type="email"`, `minlength="8"`).
- Se `src/scss` for SASS-kilder og `dist/css` for kompilerte filer.
