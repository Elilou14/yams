import { UserModel } from "../models/user";
import { UserCreate, UserRead } from "./user.types";
import { Request, Response } from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import SECRET from "./user.secret";
import mongoose from "mongoose";

dotenv.config();

// Create a new user
export async function createUser(req: Request, res: Response): Promise<void> {
    try {
        const userData: UserCreate = req.body;

        // Check if the email already exists
        const existingUser = await UserModel.findOne({ email: userData.email });
        if (existingUser) {
            res.status(400).json({ message: 'Email already exists' });
            return;
        }

        // Hash the user's password
        const hashed = await hashPassword(userData.password);

        // Create a new user with initial values
        const user = await UserModel.create({
            ...userData,
            password: hashed,
            turn: 3,
            price: 0
        });

        // Generate a JWT token for the new user
        const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '1h' });
        res.status(201).json({ message: 'User registered successfully', token });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Error registering user' });
    }
}

// Hash the password using bcrypt
async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

// Sign in an existing user
export async function signin(req: Request, res: Response): Promise<void> {
    try {
        const userData: UserRead = req.body;

        // Find the user by email
        const user = await UserModel.findOne({ email: userData.email });

        if (user) {
            // Compare the password with the stored hash
            const passwordMatch = await bcrypt.compare(userData.password, user.password);
            if (!passwordMatch) {
                res.status(401).json({ message: 'Invalid password' });
                return;
            }

            // Generate a JWT token for the user
            const token = jwt.sign({ userId: user._id }, SECRET, { expiresIn: '1h' });
            res.status(200).json({ user, token });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error signing in:', err);
        res.status(500).json({ message: 'Error signing in', err });
    }
}

// Get all users who have won something
export async function getAllWinners(req: Request, res: Response): Promise<void> {
    try {
        // Find users with a price greater than 0
        const users = await UserModel.find({ price: { $gt: 0 } });

        if (users.length === 0) {
            res.status(404).json({ message: 'Winners not found' });
            return;
        }

        res.status(200).json(users);
    } catch (err) {
        console.error('Error getting winners:', err);
        res.status(500).json({ message: 'Error getting winners', err });
    }
}

// Get a single user by ID
export async function getOneUser(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.params.userId;

        // Find the user by ID
        const user = await UserModel.findById(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Error getting user:', err);
        res.status(500).json({ message: 'Error getting user', err });
    }
}
