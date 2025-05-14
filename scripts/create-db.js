const { Client } = require('pg');
require("dotenv").config(); //env vars

const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

main();

async function main() {
    try {
        await connectToDb();
        await createTables();
        console.log("Tabelle già esistenti o create!");
        console.log("Numero tabelle: " + await printTables());
    } catch (err) {
        console.error("Errore durante la creazione/verifica delle tabelle:", err);
    }
    finally {
        client.end();
    }
}

async function printTables() {
    const queryTables = {
        name: "queryTables",
        text: `SELECT * FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')`
    };
    try {
        const result = await client.query(queryTables);
        return result.rowCount;
    } catch (err) {
        console.error("Errore nella query: " + err);
    }
}

async function createTables() {
    const queryUsers = {
        name: "createUsers",
        text: `CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            username VARCHAR(255),
            role VARCHAR(255) DEFAULT 'user',
            admin_token VARCHAR(255) UNIQUE DEFAULT NULL,
            roundwin INT DEFAULT 0,
            roundlost INT DEFAULT 0,
            roundtotal INT DEFAULT 0,
            partitewin INT DEFAULT 0,
            partitelost INT DEFAULT 0,
            partitetotal INT DEFAULT 0,
            scope INT DEFAULT 0
        )`
    };

    const queryPayments = {
        name: "createPayments",
        text: `CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID,
            name VARCHAR(255),
            description VARCHAR(500),
            price INT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
    };

    const queryCreateSessionTable = {
        name: "createSessionTable",
        text: `
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
          )
          WITH (OIDS=FALSE);
        `
    };

    const queryAddSessionPrimaryKey = {
        name: "addSessionPrimaryKey",
        text: `
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'session_pkey'
            ) THEN
              ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
            END IF;
          END
          $$;
        `
    };

    const queryCreateSessionExpireIndex = {
        name: "createSessionExpireIndex",
        text: `
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `
    };



    try {
        await client.query(queryUsers);
        await client.query(queryPayments);
        await client.query(queryCreateSessionTable);
        await client.query(queryAddSessionPrimaryKey);
        await client.query(queryCreateSessionExpireIndex);
    } catch (err) {
        console.error("Errore nella query: " + err);
    }
}

async function connectToDb() {
    try {
        await client.connect();
        console.log('Connessione al database riuscita');

    } catch (error) {
        console.error('Errore nella connessione al database:', error.message);
    }
}