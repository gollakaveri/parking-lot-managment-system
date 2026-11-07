
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const dbConfig = {
    host: "localhost",
    user: "root",
    password: "root", // Nee MySQL password ikkada pettu
    database: "users"
};

let db;

const tables = {
    people: {
        table: "person",
        pk: "user_id",
        fields: ["user_id", "user_name", "phonenumber", "email", "role"],
        required: ["user_id", "user_name", "phonenumber"]
    },

    slots: {
        table: "parking_slots",
        pk: "slot_id",
        fields: ["slot_id", "slot_number", "vehicle_type", "location", "status"],
        required: ["slot_id", "slot_number", "vehicle_type", "location", "status"]
    },

    vehicles: {
        table: "vehicles",
        pk: "vehicle_id",
        fields: ["vehicle_id", "user_id", "vehicle_number", "vehicle_type"],
        required: ["vehicle_id", "user_id", "vehicle_number", "vehicle_type"]
    },

    records: {
        table: "parking_records",
        pk: "record_id",
        fields: [
            "record_id",
            "vehicle_id",
            "slot_id",
            "entry_time",
            "exit_time",
            "parking_fee",
            "status"
        ],
        required: [
            "record_id",
            "vehicle_id",
            "slot_id",
            "entry_time",
            "parking_fee",
            "status"
        ]
    }
};

function getConfig(type) {
    const config = tables[type];
    if (!config) throw new Error("Invalid table type");
    return config;
}

function cleanData(type, body) {
    const config = getConfig(type);
    const data = {};

    config.fields.forEach(field => {
        if (body[field] !== undefined) {
            let value = body[field];

            if (value === "") value = null;

            if (typeof value === "string" && value.includes("T")) {
                value = value.replace("T", " ");
                if (value.length === 16) value += ":00";
            }

            data[field] = value;
        }
    });

    return data;
}

function validate(type, data) {
    const config = getConfig(type);

    for (const field of config.required) {
        if (
            data[field] === undefined ||
            data[field] === null ||
            data[field] === ""
        ) {
            throw new Error(field + " is required");
        }
    }
}

// GET ALL
app.get("/api/:type", async (req, res) => {
    try {
        const config = getConfig(req.params.type);

        const [rows] = await db.query(
            `SELECT * FROM \`${config.table}\` ORDER BY \`${config.pk}\``
        );

        res.json(rows);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET ONE
app.get("/api/:type/:id", async (req, res) => {
    try {
        const config = getConfig(req.params.type);

        const [rows] = await db.query(
            `SELECT * FROM \`${config.table}\` WHERE \`${config.pk}\` = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "Record not found" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// INSERT
app.post("/api/:type", async (req, res) => {
    try {
        const config = getConfig(req.params.type);
        const data = cleanData(req.params.type, req.body);

        validate(req.params.type, data);

        // Check whether manually entered ID already exists
        const [existing] = await db.query(
            `SELECT * FROM \`${config.table}\` WHERE \`${config.pk}\` = ?`,
            [data[config.pk]]
        );

        if (existing.length) {
            return res.status(400).json({
                error: config.pk + " already exists. Enter another ID."
            });
        }

        // Check foreign keys
        if (req.params.type === "vehicles") {
            const [user] = await db.query(
                "SELECT user_id FROM person WHERE user_id = ?",
                [data.user_id]
            );

            if (!user.length) {
                return res.status(400).json({
                    error: "Entered user_id does not exist in People"
                });
            }
        }

        if (req.params.type === "records") {
            const [vehicle] = await db.query(
                "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?",
                [data.vehicle_id]
            );

            if (!vehicle.length) {
                return res.status(400).json({
                    error: "Entered vehicle_id does not exist"
                });
            }

            const [slot] = await db.query(
                "SELECT slot_id FROM parking_slots WHERE slot_id = ?",
                [data.slot_id]
            );

            if (!slot.length) {
                return res.status(400).json({
                    error: "Entered slot_id does not exist"
                });
            }
        }

        const fields = Object.keys(data);
        const values = Object.values(data);

        const fieldNames = fields.map(f => `\`${f}\``).join(", ");
        const placeholders = fields.map(() => "?").join(", ");

        await db.query(
            `INSERT INTO \`${config.table}\` (${fieldNames}) VALUES (${placeholders})`,
            values
        );

        res.json({ message: "Record inserted successfully" });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// UPDATE
app.put("/api/:type/:id", async (req, res) => {
    try {
        const config = getConfig(req.params.type);
        const data = cleanData(req.params.type, req.body);

        delete data[config.pk];

        for (const field of config.required) {
            if (field === config.pk) continue;

            if (
                data[field] === undefined ||
                data[field] === null ||
                data[field] === ""
            ) {
                throw new Error(field + " is required");
            }
        }

        const fields = Object.keys(data);

        if (!fields.length) {
            throw new Error("No fields to update");
        }

        const assignments = fields.map(f => `\`${f}\` = ?`).join(", ");
        const values = fields.map(f => data[f]);

        const [result] = await db.query(
            `UPDATE \`${config.table}\` SET ${assignments} WHERE \`${config.pk}\` = ?`,
            [...values, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: "Record not found" });
        }

        res.json({ message: "Record updated successfully" });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE
app.delete("/api/:type/:id", async (req, res) => {
    try {
        const config = getConfig(req.params.type);

        const [result] = await db.query(
            `DELETE FROM \`${config.table}\` WHERE \`${config.pk}\` = ?`,
            [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: "Record not found" });
        }

        res.json({ message: "Record deleted successfully" });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// START SERVER
async function startServer() {
    try {
        db = await mysql.createPool(dbConfig);

        await db.query("SELECT 1");

        console.log("MySQL connected successfully");

        app.listen(3000, () => {
            console.log("Server running at http://localhost:3000");
        });

    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
}

startServer();
