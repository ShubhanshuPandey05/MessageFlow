const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const whatsappRoutes = require('./routes/routes.js');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

connectDB();

app.use('/api/whatsapp', whatsappRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));