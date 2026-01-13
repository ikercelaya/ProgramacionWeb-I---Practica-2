const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Asegúrate de tener bcryptjs instalado
const User = require('../models/User');
const config = require('../config');

// REGISTRO
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validación básica
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
        }

        // Verificar si ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Generar username automático si no viene (ej: iker@test.com -> iker)
        // Esto evita el error de validación de tu modelo antiguo
        const username = email.split('@')[0];

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username, 
            email,
            password: hashedPassword,
            role: 'user' // Por defecto siempre es usuario normal
        });

        await newUser.save();

        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ message: 'Error al registrar usuario: ' + error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Comparar contraseña
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Crear Token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { email: user.email, role: user.role } });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

module.exports = router;