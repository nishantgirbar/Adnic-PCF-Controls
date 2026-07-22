# Policy Read Only Member List

Read-only, quote-API-driven policy version of `customMemberListB2E`.

## Dataverse bindings

- `quoteId`: numeric SME quote ID. The control calls
  `quote-management/api/v1/sme-quotes/{quoteId}`.
- `apiUrl`: optional full quote API base URL. When blank, the control builds
  the URL from `adnic_BaseServiceUrl` and `adnic_EnvironmentName`.
- `memberData`: legacy binding retained for form compatibility; it is not used
  as the grid data source.
- `listOfMemberAbove65`: saved 65+ member/document JSON column.
- `uniqueCategoriesJson`: existing categories JSON column.
- `policy_start_date`: policy start date column.
- `adnic_name`: product type column.
- `adnic_adnic_showebpplan`: existing EBP flag column.
- `enableUpload`: set to `No` for the full member grid or `Yes` for the
  filtered overaged/65+ document grid. Membership in this grid comes directly
  from `member.overaged === true`; age is not calculated. The name is retained
  for compatibility; this control never enables uploading.

The grid is populated from `response.members.members` (with common response
wrappers also supported). JSON and XML API responses are accepted.

The control never publishes bound outputs. All member fields and benefit
selectors are disabled. In the 65+ document grid, saved remarks are read-only
and the only available document actions are **View** and **Download**.

## Build

```powershell
npm ci
npm run build
```
