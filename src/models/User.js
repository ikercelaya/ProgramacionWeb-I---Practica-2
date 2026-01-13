const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        // Lo ponemos como NO requerido explícitamente o requerido false
        // para evitar conflictos, aunque el authRoutes ya lo genera.
        required: false 
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);