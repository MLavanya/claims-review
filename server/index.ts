import { createApp } from './app.js';

const { app } = createApp();
app.listen(3001, () => console.log('Claims API listening on http://localhost:3001'));

