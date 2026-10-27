const test = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config({ quiet: true });

const localPort = Number(process.env.PORT) || 5000;
const baseUrl = (process.env.API_BASE_URL || `http://localhost:${localPort}/api/v1`).replace(/\/$/, "");
const password = process.env.API_PASSWORD;
const email = process.env.API_EMAIL || "admin@scheduledportal.com";

const apiRoutes = [
    ["GET", "/api/v1/health"],
    ["POST", "/api/v1/auth/login"],
    ["POST", "/api/v1/companies"],
    ["GET", "/api/v1/companies"],
    ["GET", "/api/v1/companies/:companyId"],
    ["PATCH", "/api/v1/companies/:companyId"],
    ["DELETE", "/api/v1/companies/:companyId"],
    ["PATCH", "/api/v1/companies/:companyId/restore"],
    ["POST", "/api/v1/plants/company/:companyId"],
    ["GET", "/api/v1/plants/company/:companyId"],
    ["GET", "/api/v1/plants/:plantId"],
    ["PATCH", "/api/v1/plants/:plantId"],
    ["DELETE", "/api/v1/plants/:plantId"],
    ["PATCH", "/api/v1/plants/:plantId/restore"],
    ["GET", "/api/v1/configuration/plant/:plantId"],
    ["PATCH", "/api/v1/configuration/plant/:plantId/general"],
    ["PATCH", "/api/v1/configuration/plant/:plantId/email"],
    ["PATCH", "/api/v1/configuration/plant/:plantId/sftp"],
    ["PATCH", "/api/v1/configuration/plant/:plantId/filename"],
    ["PATCH", "/api/v1/configuration/plant/:plantId/excel"],
    ["PATCH", "/api/v1/configuration/plant/:plantId/revision"],
    ["POST", "/api/v1/uploads/plants/:plantId/preview"],
    ["POST", "/api/v1/uploads/plants/:plantId/manual"],
    ["GET", "/api/v1/uploads/:uploadId"],
    ["POST", "/api/v1/uploads/:uploadId/complete"],
];

test("API call report setup", () => {
    if (baseUrl && (process.env.API_TOKEN || password)) return;

    console.log("\nLIVE API CALLS: NOT RUN");
    console.log("No API requests were sent, so there are no live responses to display.");
    console.log("Endpoints the live check is prepared to run:");
    for (const [method, path] of apiRoutes) {
        console.log(`NOT RUN  ${method.padEnd(6)} ${path}`);
    }
    console.log("\nTo get real request and response output, set API_PASSWORD or API_TOKEN in server .env. The local URL defaults to http://localhost:5000/api/v1; set API_BASE_URL only when using a different server.");
});

function responseSummary(payload) {
    if (payload === null || payload === undefined) return "No response body";
    let formatted = JSON.stringify(redact(payload), null, 2);
    const maxChars = 1800;
    if (formatted.length > maxChars) {
        formatted = `${formatted.slice(0, maxChars)}\n... response shortened for readability`;
    }
    return formatted;
}

function redact(value, key = "") {
    if (/password|token|authorization|secret|private.?key/i.test(key)) return "[hidden]";
    if (Array.isArray(value)) {
        const preview = value.slice(0, 3).map((item) => redact(item));
        if (value.length > 3) preview.push(`... ${value.length - 3} more item(s)`);
        return preview;
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
    }
    return value;
}

function requestSummary(options) {
    if (options.file) {
        return JSON.stringify({ file: options.file.name, contents: "sample CSV data", size: Buffer.byteLength(options.file.content) });
    }
    if (options.body !== undefined) return JSON.stringify(redact(options.body), null, 2);
    return "No request data";
}

function statusDescription(status) {
    if (status >= 200 && status < 300) return "success response";
    if (status === 400) return "request needs correction";
    if (status === 401) return "sign-in required or details rejected";
    if (status === 403) return "access not allowed";
    if (status === 404) return "item not found";
    if (status === 409) return "request conflicts with current data";
    if (status >= 500) return "server error";
    return "response received";
}

async function request(method, path, { token, body, file } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    let requestBody;
    if (file) {
        requestBody = new FormData();
        requestBody.append("file", new Blob([file.content], { type: "text/csv" }), file.name);
    } else if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, { method, headers, body: requestBody });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: response.status, data };
}

test("Live API checks", {
    skip: !process.env.API_TOKEN && !password
        ? "Set API_PASSWORD or API_TOKEN in the server .env file after starting the API."
        : false,
}, async (t) => {
    const results = [];
    let token = process.env.API_TOKEN;
    let companyId;
    let plantId;
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
    const companyCode = `QA-${suffix}`;
    const plantCode = `QA-${suffix}`;

    async function check(label, method, path, options = {}, expected = 200) {
        let payload;
        let passed = false;
        const apiNumber = results.length + 1;
        const fullUrl = `${baseUrl}${path}`;
        await t.test(label, async () => {
            console.log(`\n${"=".repeat(72)}`);
            console.log(`API ${String(apiNumber).padStart(2, "0")} — ${label}`);
            console.log(`${method} ${fullUrl}`);
            console.log(`Input:\n${requestSummary(options)}`);
            console.log(`Expected output: HTTP ${expected} (${statusDescription(expected)})`);
            try {
                const response = await request(method, path, options);
                payload = response.data;
                console.log("\nOutput from this API call:");
                console.log(`HTTP ${response.status} (${statusDescription(response.status)})`);
                console.log(responseSummary(payload));
                const expectedText = expected >= 400
                    ? `the expected rejection (HTTP ${expected})`
                    : "a successful response";
                assert.equal(response.status, expected,
                    `Expected ${expectedText}, but received HTTP ${response.status}.`);
                if (expected < 400 && payload && typeof payload === "object") {
                    assert.notEqual(payload.success, false, "The service reported that this action failed.");
                }
                passed = true;
                console.log("\nResult: PASS");
            } catch (error) {
                console.log(`\nResult: FAIL — ${error.message}`);
                throw new Error(`${error.message}\nCheck the test server and its database, then try again.`, { cause: error });
            }
        });
        results.push({ label, passed });
        return { passed, data: payload };
    }

    async function skipped(label, reason) {
        await t.test(label, { skip: reason }, () => {});
        results.push({ label, skipped: true });
    }

    const health = await check("The service responds", "GET", "/health", {}, 200);
    if (!health.passed) {
        t.diagnostic("The API checks stopped because the service did not respond.");
        return;
    }

    await check("Sign-in handles incorrect details", "POST", "/auth/login", {
        body: { email: "invalid@example.invalid", password: "incorrect" },
    }, 401);

    if (!token) {
        const login = await check("A user can sign in", "POST", "/auth/login", {
            body: { email, password },
        }, 200);
        token = login.data?.data?.token;
        if (!login.passed || !token) {
            await skipped("Protected features can be accessed", "sign-in did not return an access token");
            t.diagnostic("API results are shown above. The sign-in response did not include an access token.");
            return;
        }
    }

    await check("Requests without sign-in are blocked", "GET", "/companies", {}, 401);

    const company = await check("A company can be created", "POST", "/companies", {
        token, body: { name: `API Check ${suffix}`, code: companyCode },
    }, 201);
    companyId = company.data?.data?.id;
    if (!companyId) {
        await skipped("Company list, details, update, duplicate protection, delete and restore", "company creation did not complete");
        await skipped("Plant, settings and upload checks", "company creation did not complete");
    } else {
        await check("The company list can be viewed", "GET", "/companies", { token });
        await check("Company details can be viewed", "GET", `/companies/${companyId}`, { token });
        await check("Company details can be updated", "PATCH", `/companies/${companyId}`, {
            token, body: { name: `API Check Updated ${suffix}` },
        });
        await check("Duplicate company codes are rejected", "POST", "/companies", {
            token, body: { name: `Duplicate ${suffix}`, code: companyCode },
        }, 409);

        const plant = await check("A plant can be created", "POST", `/plants/company/${companyId}`, {
            token, body: { name: `API Check Plant ${suffix}`, code: plantCode, companyId },
        }, 201);
        plantId = plant.data?.data?.id;
        if (!plantId) {
            await skipped("Plant details, settings and upload checks", "plant creation did not complete");
        } else {
            await check("Plants for a company can be listed", "GET", `/plants/company/${companyId}`, { token });
            await check("Plant details can be viewed", "GET", `/plants/${plantId}`, { token });
            await check("Plant details can be updated", "PATCH", `/plants/${plantId}`, {
                token, body: { name: `API Check Plant Updated ${suffix}` },
            });
            await check("Duplicate plant codes are rejected", "POST", `/plants/company/${companyId}`, {
                token, body: { name: `Duplicate Plant ${suffix}`, code: plantCode, companyId },
            }, 409);

            await check("Plant settings can be viewed", "GET", `/configuration/plant/${plantId}`, { token });
            await check("General settings can be updated", "PATCH", `/configuration/plant/${plantId}/general`, { token, body: { timezone: "UTC" } });
            await check("Email settings can be updated", "PATCH", `/configuration/plant/${plantId}/email`, { token, body: { enabled: false } });
            await check("File transfer settings can be updated", "PATCH", `/configuration/plant/${plantId}/sftp`, { token, body: { enabled: false } });
            await check("Filename settings can be updated", "PATCH", `/configuration/plant/${plantId}/filename`, { token, body: { template: `api-check-${suffix}-{date}` } });
            await check("Spreadsheet settings can be updated", "PATCH", `/configuration/plant/${plantId}/excel`, { token, body: { mappings: [] } });
            await check("Revision settings can be updated", "PATCH", `/configuration/plant/${plantId}/revision`, { token, body: { enabled: false } });

            const manual = await check("A manual data preview can be created", "POST", `/uploads/plants/${plantId}/manual`, {
                token, body: { rows: [{ apiCheckId: `manual-${suffix}` }] },
            }, 201);
            const manualId = manual.data?.data?.id;
            if (manualId) {
                await check("Manual preview details can be viewed", "GET", `/uploads/${manualId}`, { token });
                await check("A manual preview can be completed", "POST", `/uploads/${manualId}/complete`, { token, body: {} });
            } else {
                await skipped("View and complete the manual preview", "preview creation did not complete");
            }

            const csv = await check("A CSV file preview can be created", "POST", `/uploads/plants/${plantId}/preview`, {
                token, file: { name: `api-check-${suffix}.csv`, content: `apiCheckId\nfile-${suffix}\n` },
            }, 201);
            const csvId = csv.data?.data?.id;
            if (csvId) {
                await check("CSV preview details can be viewed", "GET", `/uploads/${csvId}`, { token });
                await check("A CSV preview can be completed", "POST", `/uploads/${csvId}/complete`, { token, body: {} });
            } else {
                await skipped("View and complete the CSV preview", "preview creation did not complete");
            }

            const plantDelete = await check("A plant can be deactivated", "DELETE", `/plants/${plantId}`, { token });
            if (plantDelete.passed) {
                const plantRestore = await check("A deactivated plant can be restored", "PATCH", `/plants/${plantId}/restore`, { token });
                if (plantRestore.passed) await check("The demonstration plant can be cleaned up", "DELETE", `/plants/${plantId}`, { token });
            }
        }

        const companyDelete = await check("A company can be deactivated", "DELETE", `/companies/${companyId}`, { token });
        if (companyDelete.passed) {
            const companyRestore = await check("A deactivated company can be restored", "PATCH", `/companies/${companyId}/restore`, { token });
            if (companyRestore.passed) await check("The demonstration company can be cleaned up", "DELETE", `/companies/${companyId}`, { token });
        }
    }

    const passed = results.filter((item) => item.passed).length;
    const failed = results.filter((item) => !item.passed).length;
    const skippedCount = results.filter((item) => item.skipped).length;
    t.diagnostic(`API check summary: ${passed} passed, ${failed} failed, ${skippedCount} skipped.`);
    if (failed === 0 && skippedCount === 0) t.diagnostic("All listed API actions responded as expected.");
    else if (failed > 0) t.diagnostic("Some checks need attention. See the failed items above.");
    else t.diagnostic("Some checks could not run because an earlier step did not complete.");
});
