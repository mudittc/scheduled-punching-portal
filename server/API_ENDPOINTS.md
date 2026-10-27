# API Endpoint List

All routes use the `/api/v1` prefix. Replace values such as `:companyId`, `:plantId`, and `:uploadId` with the matching record ID.

Authenticated routes require an `Authorization: Bearer <token>` header. Only health and sign-in are public.

## Health and sign-in

| Method | Endpoint | What it does | Sign-in required |
|---|---|---|---|
| GET | `/api/v1/health` | Checks whether the service is responding. | No |
| POST | `/api/v1/auth/login` | Signs in with an email and password and returns an access token. | No |

## Companies

| Method | Endpoint | What it does | Sign-in required |
|---|---|---|---|
| POST | `/api/v1/companies` | Creates a company. | Yes |
| GET | `/api/v1/companies` | Lists companies. | Yes |
| GET | `/api/v1/companies/:companyId` | Gets one company. | Yes |
| PATCH | `/api/v1/companies/:companyId` | Updates a company's name or code. | Yes |
| DELETE | `/api/v1/companies/:companyId` | Deactivates a company. | Yes |
| PATCH | `/api/v1/companies/:companyId/restore` | Restores a deactivated company. | Yes |

## Plants

| Method | Endpoint | What it does | Sign-in required |
|---|---|---|---|
| POST | `/api/v1/plants/company/:companyId` | Creates a plant under a company. | Yes |
| GET | `/api/v1/plants/company/:companyId` | Lists a company's plants. | Yes |
| GET | `/api/v1/plants/:plantId` | Gets one plant. | Yes |
| PATCH | `/api/v1/plants/:plantId` | Updates a plant's name or code. | Yes |
| DELETE | `/api/v1/plants/:plantId` | Deactivates a plant. | Yes |
| PATCH | `/api/v1/plants/:plantId/restore` | Restores a deactivated plant. | Yes |

## Plant settings

| Method | Endpoint | What it does | Sign-in required |
|---|---|---|---|
| GET | `/api/v1/configuration/plant/:plantId` | Gets a plant's settings. | Yes |
| PATCH | `/api/v1/configuration/plant/:plantId/general` | Updates general settings, such as timezone and active status. | Yes |
| PATCH | `/api/v1/configuration/plant/:plantId/email` | Updates email delivery settings. | Yes |
| PATCH | `/api/v1/configuration/plant/:plantId/sftp` | Updates file transfer settings. | Yes |
| PATCH | `/api/v1/configuration/plant/:plantId/filename` | Updates the generated filename pattern. | Yes |
| PATCH | `/api/v1/configuration/plant/:plantId/excel` | Updates spreadsheet templates and column mappings. | Yes |
| PATCH | `/api/v1/configuration/plant/:plantId/revision` | Updates revision settings. | Yes |

## Uploads

| Method | Endpoint | What it does | Sign-in required |
|---|---|---|---|
| POST | `/api/v1/uploads/plants/:plantId/preview` | Uploads a CSV, XLS, or XLSX file and creates a preview. Send the file in the `file` form field. | Yes |
| POST | `/api/v1/uploads/plants/:plantId/manual` | Creates a preview from manually supplied rows. | Yes |
| GET | `/api/v1/uploads/:uploadId` | Gets an upload preview. | Yes |
| POST | `/api/v1/uploads/:uploadId/complete` | Completes an eligible upload preview. | Yes |

**Total: 25 registered endpoints.** The live checks in `test/api.integration.test.js` exercise these routes when a test server and credentials are configured.

## Running the live API checks

From the server folder, run `npm test`.

Start the server in one terminal with `npm run dev`, then run `npm test` in another terminal. The checks default to `http://localhost:5000/api/v1` (or the configured `PORT`). Add `API_PASSWORD` or `API_TOKEN` to the server `.env`; `API_EMAIL` is optional. Set `API_BASE_URL` only when using another server. The checks create uniquely named company and plant records, exercise the routes, and deactivate the demonstration records during cleanup. Use a test database.

