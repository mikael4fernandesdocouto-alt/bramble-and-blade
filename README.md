# Bramble & Blade — British barbershop portfolio

A standalone British English adaptation of the owner's Fio Bruto project. Built with plain HTML, CSS and JavaScript; no build step or backend required.

## Live demo

https://mikael4fernandesdocouto-alt.github.io/bramble-and-blade/

## Run locally

```sh
python -m http.server 8765
```

Open http://localhost:8765. GitHub Pages serves the root of the `main` branch.

## Localisation

- British English throughout, including accessible labels, validation, gallery captions and confirmation messages.
- GBP sample pricing, UK mobile validation (`07…`, `+447…`, `00447…`) and London appointment time, including GMT/BST.
- Fictional barbers: Oliver Bennett, Harry Clarke and George Ellis.
- A five-step booking demo with extras, availability checks, local persistence, cancellation and an on-page confirmation preview.
- Responsive navigation, gallery lightbox, original photography and hero video retained.

## Demonstration only

The brand, staff profiles, reviews, address, prices and availability are illustrative. The London telephone number `020 7946 0328` and sample mobile `07700 900123` are in UK ranges reserved for fictional use. The `.example` email address is a placeholder. The map link opens the Shoreditch area, not a business location.

No real appointments, messages or payments are sent. Sample booking details are kept only in this browser's local storage under `brambleandblade.demo.bookings.v1`. Use sample data; clear the site's storage to reset all saved bookings. This is not a production booking backend.

## Source and media

Adapted from https://github.com/mikael4fernandesdocouto-alt/fio-bruto at commit `8be9896d9c704d620eb27725401aa05b2be534a9`. This repository has its own history and deployment. The source project and its live deployment are independent.

Photos: Pexels, as credited in the original project (free licence). Hero video: supplied with the original mock-up. Original media files retained without alteration. Google Fonts: Barlow Condensed and DM Sans.
