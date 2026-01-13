const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String
    imageUrl: String
  }

  type User {
    id: ID!
    email: String!
    role: String!
  }

  type OrderProduct {
    name: String
    quantity: Int
    price: Float
  }

  type Order {
    id: ID!
    user: User
    products: [OrderProduct]
    total: Float
    status: String
    createdAt: String
  }

  input ProductInput {
    productId: ID!
    name: String
    price: Float
    quantity: Int!
  }

  type Query {
    getProducts: [Product]
    getUsers: [User]
    getOrders(status: String): [Order]
    getMyOrders: [Order]
  }

  type Mutation {
    createOrder(products: [ProductInput]!, total: Float!): Order
    deleteUser(userId: ID!): String
    updateUserRole(userId: ID!, role: String!): User
    updateOrderStatus(orderId: ID!, status: String!): Order
  }
`;

module.exports = typeDefs;