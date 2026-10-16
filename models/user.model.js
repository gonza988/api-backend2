import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const collection=()=>getDB().collection("users");

// 1. Definir el Schema
const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'organizer', 'admin'],
        default: 'user'
    }
}, {
    timestamps: true
});

// 2. Crear el modelo (esto es lo que faltaba)
const User = mongoose.model('User', userSchema);

// 3. Métodos del modelo
export const userModel = {
    findByEmail: async (email) => {
        return await User.findOne({ email });
    },

    findById: async (id) => {
        return await User.findById(id);
    },

    create: async (userData) => {
        return await User.create(userData);
    }
};

// También puedes exportar el modelo directamente si lo necesitas
export default User;