require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { join } = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MysqlStore = require('express-mysql-session')(session);
const multer = require('multer');
const fs = require('fs');
const cron = require('node-cron');
const moment = require('moment');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(morgan('dev'));
app.use(express.static('public'));
app.use('/css', express.static(join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


const sqlOptions = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Database connection
const connectionPool = mysql.createPool(sqlOptions);

if (connectionPool) {
    console.log('Database connected');
} else {
    console.log('Database connection failed');
}


// Session store
const sessionStore = new MysqlStore({
    expiration: (24 * 60 * 60 * 1000),
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, connectionPool);


// multer disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${file.originalname}`);
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image')) {
          return cb(new Error('Only image files are allowed'))
        }
        cb(null, true)
    }
});

const upload = multer({ storage: storage });


// Expression session
const expressSession = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        maxAge: (24 * 60 * 60 * 1000),
        sameSite: true,
        secure: false,
        name: 'session',
        httpOnly: true,
        path: '/'
    }
});


app.use(expressSession);



const createHash = (password) => {
    return password.split('').reverse().join('');
};

const compareHash = (password, hash) => {
    return createHash(password) === hash;
}


/**
 * Bad way of managing routes in one file
 */
app.get('/', async (req, res) => {
    if (req.session.user) {
        return res.redirect('/home');
    }
    res.render('index');
});

app.get('/login', async (req, res) => {
    if (req.session.user) {
        return res.redirect('/home');
    }
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { handle, password } = await req.body;

    if (!handle || !password) {
        return res.render('login', { error: 'All fields are required' });
    }

    try {
        const connection = await connectionPool.getConnection();
        const [rows, _fields] = await connection.query('SELECT * FROM users WHERE handle = ?', [handle]);
        if (rows.length > 0) {
            const user = rows[0];
            if (compareHash(password, user.password)) {
                user.password = undefined;
                req.session.user = user;
                res.redirect('/home');
            } else {
                res.render('login', { error: 'Invalid credentials' });
            }
        } else {
            res.render('login', { error: 'Invalid credentials' });
        }
        connection.release();
    } catch (error) {
        console.log(error);
        res.render('login', { error: 'Something went wrong' });
        connection.release();
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', upload.single('profile'), async (req, res) => {
    const { name, handle, password, confirmPassword } = await req.body;

    let errorMessage = '';
    if (!name || !handle || !password || !confirmPassword) {
        errorMessage = 'All fields are required';
    } else if (name.length < 3 || handle.length < 3) {
        errorMessage = 'Name and handle must be at least 3 characters';
    } else if (password.length < 6 || confirmPassword.length < 6) {
        errorMessage = 'Password must be at least 6 characters';
    } else if (password !== confirmPassword) {
        errorMessage = 'Passwords do not match';
    }

    if (errorMessage) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.render('register', { error: errorMessage });
    }

    try {
        const connection = await connectionPool.getConnection();
        const [rows, __] = await connection.query('SELECT * FROM users WHERE handle = ?', [handle]);
        if (rows.length > 0) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            connection.release();
            return res.render('register', { error: 'Handle already exists' });
        }

        const [insertedUser, _] = await connection.query('INSERT INTO users (name, handle, password) VALUES (?, ?, ?)', [name, handle, createHash(password)]);

        const [user, _fields] = await connection.query('SELECT * FROM users WHERE id = ?', [insertedUser.insertId]);
        user.password = undefined;

        if (req.file) {
            user.profile = req.file.filename;
            await connection.query('UPDATE users SET profile = ? WHERE id = ?', [req.file.filename, insertedUser.insertId]);
        }

        req.session.user = user;
        res.redirect('/home');

        connection.release();
    } catch (error) {
        console.log(error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.render('register', { error: 'Something went wrong' });
        connection.release();
    }
});


app.get('/home', async (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const connection = await connectionPool.getConnection();

        // all tweets ordered by date combined with user info (name, handle)
        const [rows, _fields] = await connection.query('SELECT tweets.id, tweets.tweet, tweets.likes, tweets.timestamp, tweets.user as user_id, tweets.media, users.name, users.handle, users.profile, (CASE WHEN likes.id IS NOT NULL THEN true ELSE false END) as is_liked FROM tweets INNER JOIN users ON tweets.user = users.id LEFT JOIN likes ON tweets.id = likes.tweet AND likes.user = ? ORDER BY tweets.timestamp DESC', [req.session.user.id]);

        // converting timestamp to human readable format
        rows.forEach((row) => {
            row.timestamp = moment(row.timestamp).fromNow();
        });

        res.render('home', { tweets: rows, user: req.session.user });
        connection.release();
    } catch (error) {
        console.log(error);
        res.render('home', { error: 'Something went wrong' });
        connection.release();
    } 
});


app.post('/createTweet', upload.single('tweet-media'), async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { tweet } = await req.body;

    try {
        const connection = await connectionPool.getConnection();
        const [row, _fields] = await connection.query('INSERT INTO tweets (tweet, user) VALUES (?, ?)', [tweet, req.session.user.id]);

        if (req.file) {
            const [updatedRows, _] = await connection.query('UPDATE tweets SET media = ? WHERE id = ?', [req.file.filename, row.insertId]);
        }

        res.redirect('/home');
        connection.release();
    } catch(error) {
        console.log(error);

        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        res.render('home', { error: 'Something went wrong' });
        connection.release();
    }
});


app.get('/tweet/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { id } = req.params;

    try {
        const connection = await connectionPool.getConnection();

        // the requested tweet combined with user data that created the tweet and also whether the current user liked it or not and then all the replies associated with the tweet

        const [rows, _fields] = await connection.query('SELECT tweets.id, tweets.tweet, tweets.likes, tweets.timestamp, tweets.user as user_id, tweets.media, users.name, users.handle, users.profile, (CASE WHEN likes.id IS NOT NULL THEN true ELSE false END) as is_liked FROM tweets INNER JOIN users ON tweets.user = users.id LEFT JOIN likes ON tweets.id = likes.tweet AND likes.user = ? WHERE tweets.id = ? ORDER BY tweets.timestamp DESC', [req.session.user.id, id]);

        if (rows.length > 0) {
            const tweet = rows[0];

            // converting timestamp to human readable format
            tweet.timestamp = moment(tweet.timestamp).format('MMMM Do YYYY, h:mm A');

            const [replies, _] = await connection.query('SELECT replies.id, replies.reply, replies.timestamp, replies.user as user_id, users.name, users.handle, users.profile FROM replies INNER JOIN users ON replies.user = users.id WHERE replies.tweet = ? ORDER BY replies.timestamp DESC', [id]);

            // converting timestamp to human readable format
            replies.forEach((reply) => {
                reply.timestamp = moment(reply.timestamp).fromNow();
            });

            // res.json({ tweet, replies, user: req.session.user });

            res.render('tweet', { tweet: tweet, replies, user: req.session.user });

        } else {
            res.redirect('/home');
        }

        connection.release();
    } catch (error) {
        console.log(error);
        res.render('home', { error: 'Something went wrong' });
        connection.release();
    }
});


app.post('/createReply/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { id } = req.params;
    const { reply } = await req.body;

    try {
        const connection = await connectionPool.getConnection();

        const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE id = ?', [id]);

        if (rows.length > 0) {
            await connection.query('INSERT INTO replies (reply, user, tweet) VALUES (?, ?, ?)', [reply, req.session.user.id, id]);
            res.redirect(`/tweet/${id}`);
        } else {
            res.redirect('/home');
        }

        connection.release();
    } catch(error) {
        console.log(error);
        res.render('home', { error: 'Something went wrong' });
        connection.release();
    }
});


app.post('/like/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { id } = req.params;
    const { liked } = req.body;

    try {
        const connection = await connectionPool.getConnection();
        const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE id = ?', [id]);
        if (rows.length > 0) {
            const tweet = rows[0];
            const change = liked ? 1 : -1;
            const [_, _fields] = await connection.query('UPDATE tweets SET likes = ? WHERE id = ?', [tweet.likes + change, id]);

            if (liked) {
                await connection.query('INSERT INTO likes (tweet, user) VALUES (?, ?)', [id, req.session.user.id]);
            } else {
                await connection.query('DELETE FROM likes WHERE tweet = ? AND user = ?', [id, req.session.user.id]);
            }

            res.json({ likes: tweet.likes + change });
        } else {
            res.render('404', { error: 'Tweet not found', url: req.url });
        }

        connection.release();
    } catch (error) {
        console.log(error);
        res.render('404', { error: 'Something went wrong', url: req.url });
        connection.release();
    }
});



/**
 * Utility functions for starting server and handling extra errors 
 */

// 404 error handler
app.use((req, res, _next) => {
    res.status(404).render('404', { url: req.url, error: "" });
});

app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).render('500', { url: req.url, error: err.message });
});


app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});


// Cron job for destroying expired sessions using sessionStore
cron.schedule('*/5 * * * *', () => {
    sessionStore.clearExpiredSessions((error) => {
        if (error) {
            console.log(error);
        }
    });
});
