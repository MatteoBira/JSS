require('dotenv').config("../");
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const SESSION_COOKIE = 'playscopa.cookie'; //nome del cookie
const SESSION_TTL = 1000 * 60 * 60 * 24; // 24h

const pgSession = require('connect-pg-simple')(session);

// --- MIDDLEWARES ---

let corsOptions = {
    origin: 'https://playscopa.online',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
}
app.set('trust proxy', true);
app.use(cors(corsOptions));
// logger middleware
app.use((req, res, next) => {
    req.time = new Date(Date.now()).toString();
    console.log(req.ip, req.method, req.hostname, req.path, req.time);
    next();
});
app.use(express.json());
app.use(cookieParser());
app.use(session({
    name: SESSION_COOKIE,
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'Lax',
        maxAge: SESSION_TTL
    },
    store: new pgSession({
        pool: pool,                // Connection pool
        tableName: 'session'   // Use another table-name than the default "session" one
    }),
}));

const checkAdmin = async function (req, res, next) {
    try {
        const token = req.query.token;
        const result = await pool.query("SELECT 1 FROM users WHERE admin_token = $1 AND role = 'admin'", [token]);
        if (result.rowCount) {  //il token c'è. rossi c'è.
            next();
        }
        else
            return res.status(401).json({ success: false, error: "Token non valido oppure l'utente non presenta i permessi necessari per accedere alla risorsa " });
    } catch (err) {
        console.log("Error middeware admin check: " + err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
}


// --- SHOW TABLE ---
app.get('/show', checkAdmin, async (req, res) => {
    try {
        const resultUser = await pool.query("SELECT * FROM users");
        const resultSession = await pool.query("SELECT * FROM session");
        return res.status(200).json({
            success: true,
            message: 'Tabella mostrata con successo',
            resultUsers: resultUser.rows,
            resultSesson: resultSession.rows
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
})


// --- CHECK USERNAME-UUID ---
app.post('/checkUid', checkAdmin, async (req, res) => {
    try {
        const username = req.body.username;
        const uuid = req.body.uuid;

        const resultUidMatch = await pool.query("SELECT EXISTS (SELECT 1 FROM users WHERE id = $1 AND username = $2)", [uuid, username]);
        if (resultUidMatch.rows[0].exists)
            return res.status(200).json({
                success: true,
                message: 'Check completato e passato.',
            });
        else
            return res.status(200).json({
                success: false,
                message: 'Missmatch tra user e UUID.',
            });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
})


// --- UPDATE STATS ---
app.post('/updateStats', checkAdmin, async (req, res) => {
    try {
        const roundwin = parseInt(req.body.roundwin) || 0;
        const roundlost = parseInt(req.body.roundlost) || 0;
        const roundtie = parseInt(req.body.roundtie) || 0;

        const partitewin = parseInt(req.body.partitewin) || 0;
        const partitelost = parseInt(req.body.partitelost) || 0;

        const scope = parseInt(req.body.scope) || 0;

        const uuid = req.body.uuid;

        if (!uuid) {
            return res.status(400).json({ success: false, error: "ERR_MISSING_UUID", message: "UUID mancante" });
        }

        console.log("===== DEBUG STATS =====");
        console.log("UUID:", uuid);
        console.log("Round Won:", roundwin);
        console.log("Round Lost:", roundlost);
        console.log("Round Tie:", roundtie);
        console.log("Partite Win:", partitewin);
        console.log("Partite Lost:", partitelost);
        console.log("Scope:", scope);
        console.log("========================");

        const updateStats = await pool.query(
            `UPDATE users
             SET roundwin = roundwin + $1,
                 roundlost = roundlost + $2,
                 roundtotal = roundtotal + $1 + $2 + $3,
                 partitewin = partitewin + $5,
                 partitelost = partitelost + $6,
                 partitetotal = partitetotal + $5 + $6,
                 scope = scope + $4
             WHERE id = $7`,
            [roundwin, roundlost, roundtie, scope, partitewin, partitelost, uuid]
        );

        if (updateStats.rowCount === 1) {
            return res.status(200).json({ success: true, message: "Statistiche aggiornate correttamente." });
        } else {
            console.log("Nessuna riga aggiornata: ", updateStats);
            return res.status(404).json({ success: false, error: "ERR_STATS", message: "Utente non trovato o nessuna modifica eseguita." });
        }

    } catch (err) {
        console.error("Errore updateStats:", err);
        return res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Errore interno del server." });
    }
});


// --- GET STATS ---
app.get('/getStats', async (req, res) => {
    try {
        if (req.session.user) {
            req.session.touch(); //update expiration
            const result = await pool.query("SELECT roundwin, roundlost, roundtotal, partitewin, partitelost, partitetotal, scope FROM users WHERE id = $1", [req.session.user.id]);
            const stats = result.rows[0];
            return res.status(200).json({
                success: true,
                code: 'SUCCESS_VALID_COOKIE',
                message: 'Cookie valido, Welcome back!',
                user: { stats: stats }
            });
        } else { //sessione assente-invalida-altro
            req.session.destroy((err) => {
                if (err) {
                    console.error("Errore durante la distruzione della sessione con getStats:", err);
                    return res.status(500).json({ success: false, error: 'Errore interno durante il getStats' });
                }
                res.clearCookie(SESSION_COOKIE);
                return res.status(401).json({
                    success: false,
                    code: 'ERR_INVALID_COOKIE',
                    message: 'Cookie invalido, devi fare login di nuovo!'
                });
            });
        }
    } catch (err) {
        console.log("Error middeware cookie check: " + err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
})


// --- CHECK COOKIE ---
app.get('/checkCookie', async (req, res) => {
    console.log("benzema: " + JSON.stringify(req.cookies));
    try {
        if (req.session.user) {
            req.session.touch(); //update expiration
            return res.status(200).json({
                success: true,
                code: 'SUCCESS_VALID_COOKIE',
                message: 'Cookie valido, Welcome back!',
                user: { id: req.session.user.id, email: req.session.user.email, username: req.session.user.username }
            });
        } else { //sessione assente-invalida-altro
            req.session.destroy((err) => {
                if (err) {
                    console.error("Errore durante la distruzione della sessione con checkcookie:", err);
                    return res.status(500).json({ success: false, error: 'Errore interno durante il checkCookie' });
                }
                res.clearCookie(SESSION_COOKIE);
                return res.status(401).json({
                    success: false,
                    code: 'ERR_INVALID_COOKIE',
                    message: 'Cookie invalido, devi fare login di nuovo!'
                });
            });
        }
    } catch (err) {
        console.log("Error middeware cookie check: " + err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
})

// --- REGISTER ---
app.post('/register', async (req, res) => {
    //console.log(req.body); debug only.
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
        return res.status(400).json({ success: false, code: 'ERR_MISSING_PARAM', error: 'Email, password e username sono obbligatori.' });
    }

    try {
        // 1) Verifica che l'email non esista già
        const exists = await pool.query(
            'SELECT 1 FROM users WHERE email = $1',
            [email]
        );
        if (exists.rowCount) {
            return res.status(409).json({ success: false, code: 'ERR_EMAIL_IN_USE', error: 'Email già in uso.' });
        }


        // 2) Hash della password
        const hash = await bcrypt.hash(password, 12);

        // 3) Inserimento utente
        const result = await pool.query(
            `INSERT INTO users (email, password, username)
       VALUES ($1,$2,$3)
       RETURNING id, email, username`,
            [email, hash, username]
        );
        const user = result.rows[0];

        // 4) Crea sessione e salva in DB (configurato nel middleware)
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        return res.status(201).json({
            success: true,
            message: 'Registrazione completata con successo!',
            user: { id: user.id, email: user.email, username: user.username }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
    console.log('Cookies:', req.cookies);
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email e password sono obbligatori.' });
    }

    try {
        // 1) Recupera utente
        const result = await pool.query(
            'SELECT id, password, username FROM users WHERE email = $1',
            [email]
        );
        if (!result.rowCount) {
            return res.status(401).json({ success: false, error: 'Credenziali non valide noon esiste.' });
        }
        const user = result.rows[0];

        // 2) Verifica password
        const match = await bcrypt.compare(password, user.password); //password from frontend. user.password from database by email
        if (!match) {
            return res.status(401).json({ success: false, error: 'Credenziali non valide.' });
        }

        // 3) Crea sessione e salva in DB (configurato nel middleware)
        if (req.session.user)
            console.log("C'È GIÀ AOAOAOAO");
        else {
            console.log("JNDFSJNFSDKJN");
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };
        }


        return res.json({
            success: true,
            message: 'Login effettuato con successo!',
            user: { id: user.id, email, username: user.username }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
});

// --- Logout ---
app.get('/logout', async (req, res) => {
    try {
        if (req.session.user) {
            req.session.destroy((err) => {
                if (err) {
                    console.error("Errore durante la distruzione della sessione con logout:", err);
                    return res.status(500).json({ success: false, error: 'Errore interno durante il logout' });
                }
                res.clearCookie(SESSION_COOKIE);
                return res.status(200).json({
                    success: true,
                    code: 'SUCCESS_LOGOUT',
                    message: 'Logout effettuato con successo'
                });
            });

        } else { //sessione assente-invalida-altro
            return res.status(401).json({
                success: false,
                code: 'ERR_LOGOUT',
                message: 'Cookie invalido'
            });
        }

    } catch (err) {
        console.log("Error logout route: " + err);
        return res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
});

// --- Avvio server ---
const PORT = process.env.API_PORT;
app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});