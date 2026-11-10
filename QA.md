# Verification

The local version was exercised in Chromium with Playwright before publication.

Passed checks:

- Complete five-step booking with required-field errors and consent validation.
- UK domestic and international mobile formats; Brazilian and invalid numbers rejected.
- GBP prices match the visible service menu; extras update both price and duration.
- Draft details survive reload; confirming blocks the selected barber/time locally; cancellation releases it.
- Confirmation preview remains on the page and sends no messages.
- All three barber shortcuts, keyboard radio selection, and all six gallery images with Escape dismissal.
- Mobile navigation opens and closes after choosing a link.
- Layout at 320, 375, 390, 760, 768, 1024 and 1440 CSS pixels; no page or heading overflow.
- London time conversion in winter, summer and across midnight, with a browser configured for São Paulo.
- All local images and video load; no JavaScript exceptions or failed local asset requests.
- Internal anchor targets exist, page language is `en-GB`, and original branding, contact number and Portuguese UI strings are absent from rendered HTML.

Desktop and mobile screenshots were visually reviewed. The live GitHub Pages version is also checked after deployment.
