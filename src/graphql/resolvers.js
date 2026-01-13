const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

const resolvers = {
    Query: {
        // Requisito: Lectura de productos por GraphQL
        getProducts: async () => {
            return await Product.find();
        },
        // Requisito: Admin ve usuarios
        getUsers: async (_, __, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            return await User.find();
        },
        // Requisito: Admin ve pedidos (con filtro opcional)
        getOrders: async (_, { status }, context) => {
            if (!context.user || context.user.role !== 'admin') throw new Error('No autorizado');
            const filter = status ? { status } : {};
            return await Order.find(filter).populate('user').sort({ createdAt: -1 });
        },
        // Requisito: Usuario ve sus propios pedidos
        getMyOrders: async (_, __, context) => {
            if (!context.user) throw new Error('No autenticado');
            return await Order.find({ user: context.user.userId }).sort({ createdAt: -1 });
        }
    },
    Mutation: {
        // Requisito: Crear pedido
        createOrder: async (_, { products, total }, context) => {
            if (!context.user) throw new Error('Debes iniciar sesión');
            
            const newOrder = new Order({
                user: context.user.userId,
                products,
                total,
                status: 'Completed' // Simulamos que se paga al instante
            });
            return await newOrder.save();
        },
        // Requisito: Admin borra usuario
        deleteUser: async (_, { userId }, context) => {
            if (context.user.role !== 'admin') throw new Error('No autorizado');
            await User.findByIdAndDelete(userId);
            return "Usuario eliminado";
        },
        // Requisito: Admin cambia rol
        updateUserRole: async (_, { userId, role }, context) => {
            if (context.user.role !== 'admin') throw new Error('No autorizado');
            return await User.findByIdAndUpdate(userId, { role }, { new: true });
        },
        // Requisito: Admin cambia estado pedido
        updateOrderStatus: async (_, { orderId, status }, context) => {
            if (context.user.role !== 'admin') throw new Error('No autorizado');
            return await Order.findByIdAndUpdate(orderId, { status }, { new: true });
        }
    }
};

module.exports = resolvers;