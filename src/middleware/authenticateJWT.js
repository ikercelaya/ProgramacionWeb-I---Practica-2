const jwt = require('jsonwebtoken');
const config = require('../config');

// 1. Middleware para validar que el usuario está logueado
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Separar "Bearer <token>"

        jwt.verify(token, config.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Token inválido o expirado' });
            }
            req.user = user; // Guardamos los datos del usuario en la petición
            next();
        });
    } else {
        res.status(401).json({ message: 'Autenticación requerida' });
    }
};

// 2. Middleware para validar que el usuario es ADMINISTRADOR
const checkAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Es admin, pasa
    } else {
        res.status(403).json({ message: 'Acceso denegado: Se requiere administrador' });
    }
};

module.exports = { authenticateJWT, checkAdmin };