const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello from Hostinger! The server is alive.');
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ SERVER SUCCESSFULLY STARTED ON PORT ${port} ✅`);
});