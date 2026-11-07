
const labels = {
    people: "People",
    slots: "Parking Slots",
    vehicles: "Vehicles",
    records: "Parking Records"
};

const primaryKeys = {
    people: "user_id",
    slots: "slot_id",
    vehicles: "vehicle_id",
    records: "record_id"
};

const columns = {
    people: [
        { key: "user_id", label: "User ID" },
        { key: "user_name", label: "User Name" },
        { key: "phonenumber", label: "Phone Number" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" }
    ],
    slots: [
        { key: "slot_id", label: "Slot ID" },
        { key: "slot_number", label: "Slot Number" },
        { key: "vehicle_type", label: "Vehicle Type" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status" }
    ],
    vehicles: [
        { key: "vehicle_id", label: "Vehicle ID" },
        { key: "user_id", label: "User ID" },
        { key: "user_name", label: "Owner" },
        { key: "vehicle_number", label: "Vehicle Number" },
        { key: "vehicle_type", label: "Vehicle Type" }
    ],
    records: [
        { key: "record_id", label: "Record ID" },
        { key: "vehicle_id", label: "Vehicle ID" },
        { key: "vehicle_number", label: "Vehicle Number" },
        { key: "slot_id", label: "Slot ID" },
        { key: "slot_number", label: "Slot Number" },
        { key: "entry_time", label: "Entry Time" },
        { key: "exit_time", label: "Exit Time" },
        { key: "parking_fee", label: "Parking Fee" },
        { key: "status", label: "Status" }
    ]
};

function getType() {
    const type = new URLSearchParams(location.search).get("type") || "people";
    return labels[type] ? type : "people";
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

async function api(url, options = {}) {
    const config = {
        ...options,
        headers: { ...(options.headers || {}) }
    };

    if (config.body && !config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, config);
    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `Request failed (${response.status})`);
    }

    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function showError(message) {
    const el =
        document.getElementById("details") ||
        document.getElementById("dataForm") ||
        document.getElementById("tbody");

    if (el) {
        el.innerHTML = `<p class="error">${esc(message)}</p>`;
    } else {
        alert(message);
    }
}

async function selectOptions(kind, selected) {
    const rows = await api("/api/options/" + kind);

    return '<option value="">Select...</option>' +
        rows.map(r => `
            <option value="${esc(r.id)}"
                ${String(selected ?? "") === String(r.id) ? "selected" : ""}>
                ${esc(r.label)} (ID: ${esc(r.id)})
            </option>
        `).join("");
}

async function formFields(type, row = {}) {
    const specs = {
        people: [
            ["user_id", "User ID", "number", true],
            ["user_name", "User Name", "text", true],
            ["phonenumber", "Phone Number", "tel", true],
            ["email", "Email", "email", false],
            ["role", "Role", "select:Customer|Admin|Staff", false]
        ],

        slots: [
            ["slot_id", "Slot ID", "number", true],
            ["slot_number", "Slot Number", "text", true],
            ["vehicle_type", "Vehicle Type",
                "select:Two Wheeler|Four Wheeler|Heavy Vehicle", true],
            ["location", "Location", "text", true],
            ["status", "Status",
                "select:Available|Occupied|Maintenance", true]
        ],

        vehicles: [
            ["vehicle_id", "Vehicle ID", "number", true],
            ["user_id", "User ID", "options:people", true],
            ["vehicle_number", "Vehicle Number", "text", true],
            ["vehicle_type", "Vehicle Type",
                "select:Two Wheeler|Four Wheeler|Heavy Vehicle", true]
        ],

        records: [
            ["record_id", "Record ID", "number", true],
            ["vehicle_id", "Vehicle ID", "options:vehicles", true],
            ["slot_id", "Slot ID", "options:slots", true],
            ["entry_time", "Entry Time", "datetime-local", true],
            ["exit_time", "Exit Time", "datetime-local", false],
            ["parking_fee", "Parking Fee", "number", true],
            ["status", "Status", "select:Parked|Completed", true]
        ]
    };

    let html = "";

    for (const [name, label, kind, required] of specs[type]) {
        let value = row[name] ?? "";

        // Foreign key dropdowns
        if (kind.startsWith("options:")) {
            const optionKind = kind.split(":")[1];

            html += `
                <label>
                    ${label}
                    <select name="${name}" ${required ? "required" : ""}>
                        ${await selectOptions(optionKind, value)}
                    </select>
                </label>
            `;
        }

        // Fixed dropdowns
        else if (kind.startsWith("select:")) {
            const opts = kind.split(":")[1].split("|");

            html += `
                <label>
                    ${label}
                    <select name="${name}" ${required ? "required" : ""}>
                        <option value="">Select...</option>
                        ${opts.map(v => `
                            <option value="${esc(v)}"
                                ${String(value) === v ? "selected" : ""}>
                                ${esc(v)}
                            </option>
                        `).join("")}
                    </select>
                </label>
            `;
        }

        // Date and time
        else {
            if (kind === "datetime-local" && value) {
                const d = new Date(value);

                if (!Number.isNaN(d.getTime())) {
                    const local = new Date(
                        d.getTime() - d.getTimezoneOffset() * 60000
                    );
                    value = local.toISOString().slice(0, 16);
                } else {
                    value = String(value).replace(" ", "T").slice(0, 16);
                }
            }

            html += `
                <label>
                    ${label}
                    <input
                        name="${name}"
                        type="${kind}"
                        value="${esc(value)}"
                        ${kind === "number" ? 'min="1" step="1"' : ""}
                        ${required ? "required" : ""}
                    >
                </label>
            `;
        }
    }

    return html;
}

function readForm(form) {
    const data = {};

    new FormData(form).forEach((value, key) => {
        data[key] = value;
    });

    return data;
}
