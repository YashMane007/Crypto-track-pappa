const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3036;

// Serve static files from the "public" directory
app.use(express.static('public'));
app.use(bodyParser.json());

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

pool.on('acquire', (connection) => {
    console.log('Connection %d acquired', connection.threadId);
});

pool.on('connection', (connection) => {
    console.log('New connection established');
});

pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle MySQL client', err);
    process.exit(-1);
});

const executeQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        pool.query(query, params, (error, results) => {
            if (error) {
                console.error('Database query error:', error);
                return reject(error);
            }
            resolve(results);
        });
    });
};

const createTables = async () => {
    try {
        const createCoinsTableQuery = `
            CREATE TABLE IF NOT EXISTS coins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(10) NOT NULL,
                quantity INT NOT NULL DEFAULT 0
            )
        `;
        await executeQuery(createCoinsTableQuery);
        console.log('Coins table created or already exists');

        const createINRPriceTableQuery = `
            CREATE TABLE IF NOT EXISTS inr_price (
                id INT AUTO_INCREMENT PRIMARY KEY,
                price DECIMAL(10, 2) NOT NULL DEFAULT 85
            )
        `;
        await executeQuery(createINRPriceTableQuery);
        console.log('INR price table created or already exists');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
};

createTables();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');  // Serve index.html
});

app.get('/api/coins', async (req, res) => {
    try {
        const results = await executeQuery('SELECT id, symbol, quantity FROM coins');
        console.log('Fetched coins from database:', results);
        res.json(results);
    } catch (error) {
        console.error('Error fetching coins:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/coins', async (req, res) => {
    const { symbol, quantity } = req.body;
    try {
        const results = await executeQuery('INSERT INTO coins (symbol, quantity) VALUES (?, ?)', [symbol, quantity]);
        res.status(201).json({ id: results.insertId, symbol, quantity });
    } catch (error) {
        console.error('Error inserting coin:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/coins/:id/symbol', async (req, res) => {
    const { id } = req.params;
    const { newSymbol } = req.body;
    try {
        const results = await executeQuery('UPDATE coins SET symbol = ? WHERE id = ?', [newSymbol, id]);
        if (results.affectedRows === 0) {
            console.warn('No rows updated. ID may not exist.');
            res.status(404).send('Coin not found.');
        } else {
            res.sendStatus(200);
        }
    } catch (error) {
        console.error('Error updating symbol:', error);
        res.status(500).send('Failed to update symbol.');
    }
});

app.put('/api/coins/:id/quantity', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    try {
        await executeQuery('UPDATE coins SET quantity = ? WHERE id = ?', [quantity, id]);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/coins/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await executeQuery('DELETE FROM coins WHERE id = ?', [id]);
        res.sendStatus(204);
    } catch (error) {
        console.error('Error deleting coin:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/inr', async (req, res) => {
    try {
        const results = await executeQuery('SELECT price FROM inr_price WHERE id = 1');
        console.log('Fetched INR price from database:', results);
        if (results.length > 0) {
            const inrPrice = results[0].price;
            res.json({ inrPrice });
        } else {
            console.warn('No INR price found, returning default value');
            res.json({ inrPrice: 85 });
        }
    } catch (error) {
        console.error('Error fetching INR price:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/inr', async (req, res) => {
    const { price } = req.body;
    try {
        const results = await executeQuery('UPDATE inr_price SET price = ? WHERE id = 1', [price]);
        if (results.affectedRows === 0) {
            await executeQuery('INSERT INTO inr_price (id, price) VALUES (1, ?)', [price]);
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error updating INR price:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
