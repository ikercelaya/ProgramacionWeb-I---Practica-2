const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['camisetas', 'pantalones', 'zapatos', 'accesorios'] 
    },
    imageUrl: {
        type: String,
        required: true
    },

    stock: {
        type: Number,
        default: 100 
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);