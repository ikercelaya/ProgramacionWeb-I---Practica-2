require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require("socket.io");
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express');

const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const ChatMessage = require('./models/ChatMessage');

// GraphQL Imports
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- MIDDLEWARES (AQUÍ ESTÁ LA CORRECCIÓN) ---
app.use(cors());

// Servir archivos estáticos (HTML, CSS, JS del cliente)
app.use(express.static('src/public'));

// ERROR CORREGIDO: Aplicamos el parser JSON *SOLO* a las rutas que empiezan por '/api'
// Dejamos libre la ruta '/graphql' para que Apollo Server gestione su propia lectura de datos.
const jsonParser = express.json({ limit: '10mb' });
const urlEncodedParser = express.urlencoded({ limit: '10mb', extended: true });

app.use('/api', jsonParser);
app.use('/api', urlEncodedParser);
// ----------------------------------------------

// Conexión Base de Datos
mongoose.connect(config.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error MongoDB:', err));

// Rutas REST
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Configuración de Apollo Server (GraphQL)
async function startApolloServer() {
    const apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }) => {
            const token = req.headers.authorization || '';
            if (token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const tokenValue = token.split(' ')[1];
                    const user = jwt.verify(tokenValue, config.JWT_SECRET);
                    return { user };
                } catch (e) {
                    return {};
                }
            }
            return {};
        }
    });

    await apolloServer.start();
    // Apollo se engancha aquí. Al no tener el jsonParser global antes, funcionará perfecto.
    apolloServer.applyMiddleware({ app });
    console.log(`🚀 GraphQL listo en /graphql`);
}

startApolloServer();

// Socket.IO (Chat)
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Autenticación requerida'));
    try {
        const jwt = require('jsonwebtoken');
        const user = jwt.verify(token, config.JWT_SECRET);
        socket.user = user;
        next();
    } catch (err) {
        next(new Error('Token inválido'));
    }
});

io.on('connection', async (socket) => {
    const messages = await ChatMessage.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('chat history', messages);

    socket.on('chat message', async (msg) => {
        const chatMessage = new ChatMessage({
            user: socket.user.email,
            message: msg,
            timestamp: new Date()
        });
        await chatMessage.save();
        io.emit('chat message', { user: socket.user.email, message: msg });
    });
});

const PORT = config.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});