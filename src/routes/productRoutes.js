const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateJWT, checkAdmin } = require('../middleware/authenticateJWT');

// OBTENER TODOS (Pública)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// CREAR (Admin)
router.post('/', authenticateJWT, checkAdmin, async (req, res) => {
    const { name, description, price, category, imageUrl, stock } = req.body;
    
    // Validación básica (stock opcional, por defecto 100 en modelo)
    if (!name || !description || !price || !category || !imageUrl) {
        return res.status(400).json({ message: 'Rellena todos los campos e imagen' });
    }

    try {
        const newProduct = new Product({
            name, description, price, category, imageUrl, stock,
            user: req.user.userId
        });
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        if (error.name === 'PayloadTooLargeError') return res.status(413).json({ message: 'Imagen muy pesada' });
        res.status(400).json({ message: error.message });
    }
});

// EDITAR (Admin) - NUEVO
router.put('/:id', authenticateJWT, checkAdmin, async (req, res) => {
    try {
        const { name, description, price, category, imageUrl } = req.body;
        
        // Buscamos el producto
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

        // Actualizamos campos
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.category = category || product.category;
        
        // Solo actualizamos la imagen si el usuario subió una nueva
        if (imageUrl) {
            product.imageUrl = imageUrl;
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        if (error.name === 'PayloadTooLargeError') return res.status(413).json({ message: 'Imagen muy pesada' });
        res.status(400).json({ message: error.message });
    }
});

// BORRAR (Admin)
router.delete('/:id', authenticateJWT, checkAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;