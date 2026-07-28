# Audit Trail PCF control

Displays the full activity timeline for a quote by calling:

`GET {adnic_BaseServiceUrl}/{adnic_EnvironmentName}/quote-management/api/v1/audit/quotes/{quoteId}/timeline`

## Inputs

- `quoteId`: required bound text property containing the numeric quote ID. Bind this
  to the appropriate Dataverse text column when adding the control to a
  model-driven form.
- `bearerToken`: JWT; either a raw JWT or a value beginning with `Bearer `.
- `refreshTrigger`: optional value that reloads the control whenever it changes.

If the bound `quoteId` value is empty, the control falls back to a form/page
parameter named `quoteId` for compatibility with custom-page navigation. A
resolved navigation value is cached in the browser's tab-scoped session storage
so the control can restore it when that custom page is refreshed.

The displayed quote number is read from `quoteNumber` in an audit event's JSON
payload returned by the timeline API.

The API URL is built from the Dataverse environment variables
`adnic_BaseServiceUrl` and `adnic_EnvironmentName`, following the same convention
as the Quote Summary controls.

The API host must allow the Power Apps origin through CORS. Avoid storing a long-lived
token in Dataverse; supply a short-lived token from the app/session.

## Build

Run `npm install`, followed by `npm run build`.
