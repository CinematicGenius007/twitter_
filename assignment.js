const express = require('express');
const router = express.Router();

// Router for the assignment - by '/admin'

/**
 * Today's Assignment - March 6, 2023
 */

/**
 * Get all the tweets based on the query parameters - date and user
 */
router.get('/tweets', async (req, res) => {
    const { date, user } = req.query;

    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    try {
        const connection = await connectionPool.getConnection();

        let tweets = [];

        if (date && user) {
            const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE user = ? AND created_at LIKE ?', [user, `${date}%`]);
            tweets = rows;
        } else if (date) {
            const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE created_at LIKE ?', [`${date}%`]);
            tweets = rows;
        } else if (user) {
            const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE user = ?', [user]);
            tweets = rows;
        } else {
            const [rows, _fields] = await connection.query('SELECT * FROM tweets');
            tweets = rows;
        }

        res.render('tweets', { tweets: tweets, user: req.session.user });
    } catch (error) {
        console.log(error);
        res.render('tweets', { error: 'Something went wrong', user: req.session.user });
    }
});


/**
 * Get all the users based on the query parameter - name
 */
router.get('/users', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { name } = req.query;

    try {
        const connection = await connectionPool.getConnection();

        const [rows, _fields] = await connection.query('SELECT * FROM users WHERE name LIKE ?', [`%${name}%`]);

        res.render('users', { users: rows, user: req.session.user });
    } catch (error) {
        console.log(error);
        res.render('users', { error: 'Something went wrong', user: req.session.user });
    }
});


/**
 * Get a particular user based on the id
 */
router.get('/user/:id', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { id } = req.params;

    try {
        const connection = await connectionPool.getConnection();

        const [rows, _fields] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);

        if (rows.length > 0) {
            res.render('user', { user: rows[0], sessionUser: req.session.user });
        } else {
            res.render('user', { error: 'User not found', sessionUser: req.session.user });
        }
    } catch (error) {
        console.log(error);
        res.render('user', { error: 'Something went wrong', sessionUser: req.session.user });
    }
});


/**
 * Delete a particular tweet based on the id
 */
router.post('/tweet/delete/:id', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { id } = req.params;

    try {
        const connection = await connectionPool.getConnection();

        const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE id = ?', [id]);

        if (rows.length > 0) {
            await connection.query('DELETE FROM tweets WHERE id = ?', [id]);
            res.redirect('/tweets');
        } else {
            res.render('404', { error: 'Tweet not found', url: req.url });
        }
    } catch (error) {
        console.log(error);
        res.render('404', { error: 'Something went wrong', url: req.url });
    }
});


/**
 * Delete a list of tweets based on the ids (given as an array in the request body)
 */
router.post('/tweets/delete', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { ids } = req.body;

    try {
        const connection = await connectionPool.getConnection();

        await connection.query('DELETE FROM tweets WHERE id IN (?)', [ids]);

        res.redirect('/tweets');
    } catch (error) {
        console.log(error);
        res.render('404', { error: 'Something went wrong', url: req.url });
    }
});


/**
 * Get all the tweets for a particular user
 */
router.get('/user/:id/tweets', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { id } = req.params;

    try {
        const connection = await connectionPool.getConnection();

        const [rows, _fields] = await connection.query('SELECT * FROM tweets WHERE user_id = ?', [id]);

        res.render('tweets', { tweets: rows, user: req.session.user });
    } catch (error) {
        console.log(error);
        res.render('tweets', { error: 'Something went wrong', user: req.session.user });
    }
});


/**
 * Delete all the tweets for a particular user
 */
router.post('/users/:id/tweets/delete', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { id } = req.params;

    try {
        const connection = await connectionPool.getConnection();

        await connection.query('DELETE FROM tweets WHERE user = ?', [id]);

        res.redirect(`/user/${id}/tweets`);
    } catch (error) {
        console.log(error);
        res.render('500', { error: 'Something went wrong', url: req.url });
    }
});


/**
 * Delete a list of users based on the ids (given as an array in the request body)
 */
router.post('/users/delete', async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/login');
    }

    const { ids } = req.body;

    try {
        const connection = await connectionPool.getConnection();

        await connection.query('DELETE FROM users WHERE id IN (?)', [ids]);

        res.redirect('/users');
    } catch (error) {
        console.log(error);
        res.render('500', { error: 'Something went wrong', url: req.url });
    }
});



/**
 * Today's Assignment - March 6, 2023
 */


module.exports = router;