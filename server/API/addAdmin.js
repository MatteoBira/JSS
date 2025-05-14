require('dotenv').config("../");
const { Client } = require('pg');

const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

connectToDb();

async function connectToDb() {
    try {
        await client.connect();
        console.log('Connessione al database riuscita');
        if (process.argv[2] == "-api")
            console.log(await createAdmin());
        else
            console.log(await setAdmin(process.argv[2]));
    } catch (error) {
        console.error('Errore nella connessione al database:', error.message);
    }
}

async function setAdmin(email) {
    try {
        const result = await client.query("UPDATE users SET role = 'admin', admin_token = substr(md5(random()::text), 1, 32) WHERE email = $1 RETURNING admin_token", [email]);
        return result.rows[0].admin_token;
    } catch (err) {
        console.error('Errore nella query admin', err.message);
    }
}

async function createAdmin() {
    try {
        const result = await client.query("INSERT INTO users (role, admin_token) VALUES ($1, substr(md5(random()::text), 1, 32)) RETURNING admin_token", ['admin'])
        return result.rows[0].admin_token;
    } catch (err) {
        console.error('Errore nella query admin', err.message);
    }
}