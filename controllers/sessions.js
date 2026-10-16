import passport from 'passport';
import bcrypt from 'bcrypt';

import * as usersRepository from '../repositories/users.repository.js';
import { generateToken } from '../utils/jwt.js';

export const getCurrentUser = async (req, res) => {
  try {
    // El middleware `auth` ya debería haber puesto el usuario en req.user
    const user = req.user;

    if (!user) {
      return res.status().json({ 
        status: 'error', 
        message: 'No hay usuario autenticado' 
      });
    }

    // Opcional: quitar campos sensibles como password
    const { password, ...safeUser } = user.toObject ? user.toObject() : user;

    res.status(200).json({
      status: 'success',
      payload: safeUser
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};



export const login = (req, res, next) => {

    passport.authenticate('login', (error, user, info) => {

        if (error) {
            return next(error);
        }

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: info?.message || 'Credenciales inválidas'
            });
        }

        const token = generateToken({
            id: user._id,
            email: user.email,
            role: user.role
        });

        res.cookie('currentUser', token, {
            httpOnly: true,
            secure: false,
            maxAge: 60 * 60 * 1000
        });

        return res.json({
            status: 'success',
            message: 'Login exitoso',
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        });

    })(req, res, next);
};


export const logout = (req, res) => {

    res.clearCookie('currentUser');

    res.json({
        status: 'success',
        message: 'Logout exitoso'
    });

};


export const register = async (req, res, next) => {

    try {

        const {
            first_name,
            last_name,
            email,
            age,
            password
        } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Todos los campos son obligatorios'
            });
        }

        const existingUser = await usersRepository.getByEmail(email);

        if (existingUser) {
            return res.status(409).json({
                status: 'error',
                message: 'El email ya está registrado'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await usersRepository.create({
            first_name,
            last_name,
            email,
            age,
            password: hashedPassword,
            role: 'user'
        });

        return res.status(201).json({
            status: 'success',
            message: 'Usuario registrado correctamente',
            user: {
                id: newUser._id,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                age: newUser.age,
                role: newUser.role
            }
        });

    } catch (error) {

        next(error);

    }


   

};