import { Request, Response } from "express";
import { PastryModel } from "../models/pastry";
import { UserModel } from "../models/user";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import SECRET from "../user/user.secret";
import { DecodedUser } from "../user/user.types";

// Update the game state based on the user's action
export async function updateGame(req: Request, res: Response): Promise<void> {
    const token: string = req.headers['x-access-token'] as string;

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, SECRET) as DecodedUser;
        const userId: mongoose.Types.ObjectId = decoded.userId;

        if (!userId) {
            console.log('Error: user not found');
            return;
        }

        // Decrease the user's turn count
        await decreaseTurn(userId);

        // Roll five dice
        const dice: number[] = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);

        // Count occurrences of each dice number
        const counts: { [key: number]: number } = dice.reduce((acc, num) => {
            acc[num] = (acc[num] || 0) + 1;
            return acc;
        }, {});

        const maxCount = Math.max(...Object.values(counts));

        // Determine game result based on dice rolls
        if (maxCount === 5) {
            await updateYams(req, res, userId);
        } else if (maxCount === 4) {
            await updateCarre(req, res, userId);
        } else if (maxCount === 2 && Object.values(counts).filter(count => count === 2).length === 2) {
            await updateDouble(req, res, userId);
        } else {
            console.log('None of the conditions met');
            res.status(200).json({ result: 'None of the conditions met.' });
        }
    } catch (err) {
        console.error('Error updating game:', err);
        res.status(500).json({ message: 'Error updating game', err });
    }
}

// Decrease the user's turn count
async function decreaseTurn(userId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (user.turn <= 0) {
            throw new Error("No more turns available");
        }
        user.turn = Math.max(0, user.turn - 1);
        await user.save();
        return true;
    } catch (err) {
        console.error('Error decreasing turn:', err);
        return false;
    }
}

// Handle "Yams" game result
async function updateYams(req: Request, res: Response, userId: mongoose.Types.ObjectId): Promise<void> {
    console.log('Entering updateYams');
    try {
        const pastries = await PastryModel.find();
        const user = await UserModel.findById(userId);
        const randomIndices = getRandomIndices(pastries.length, 3);

        await Promise.all(randomIndices.map(async (index) => {
            if (pastries[index].stock > 0) {
                const reduction = Math.min(3, pastries[index].stock);
                pastries[index].stock -= reduction;
                pastries[index].quantityWon += reduction;

                if (user) {
                    user.price += reduction;
                    user.userPrice.push({
                        pasty: { _id: pastries[index]._id },
                        name: pastries[index].name,
                        numberOfPastries: pastries[index].quantityWon
                    });
                }
                await pastries[index].save();
            }
        }));

        if (user) {
            await user.save();
        }

        res.status(200).json({ pastries, message: 'yams' });
    } catch (err) {
        console.error('Error updating Yams:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error updating Yams', err });
        }
    }
}

// Handle "Carre" game result
async function updateCarre(req: Request, res: Response, userId: mongoose.Types.ObjectId): Promise<void> {
    console.log('Entering updateCarre');
    try {
        const pastries = await PastryModel.find();
        const user = await UserModel.findById(userId);
        const randomIndices = getRandomIndices(pastries.length, 2);

        await Promise.all(randomIndices.map(async (index) => {
            if (pastries[index].stock > 0) {
                const reduction = Math.min(2, pastries[index].stock);
                pastries[index].stock -= reduction;
                pastries[index].quantityWon += reduction;

                if (user) {
                    user.price += reduction;
                    user.userPrice.push({
                        pasty: { _id: pastries[index]._id },
                        name: pastries[index].name,
                        numberOfPastries: pastries[index].quantityWon
                    });
                }
                await pastries[index].save();
            }
        }));

        if (user) {
            await user.save();
        }

        res.status(200).json({ pastries, message: 'carre' });
    } catch (err) {
        console.error('Error updating Carre:', err);
        res.status(500).json({ message: 'Error updating Carre', err });
    }
}

// Handle "Double" game result
async function updateDouble(req: Request, res: Response, userId: mongoose.Types.ObjectId): Promise<void> {
    console.log('Entering updateDouble');
    try {
        const pastries = await PastryModel.find();
        const user = await UserModel.findById(userId);
        const randomIndices = getRandomIndices(pastries.length, 1);

        await Promise.all(randomIndices.map(async (index) => {
            if (pastries[index].stock > 0) {
                const reduction = Math.min(1, pastries[index].stock);
                pastries[index].stock -= reduction;
                pastries[index].quantityWon += reduction;

                if (user) {
                    user.price += reduction;
                    user.userPrice.push({
                        pasty: { _id: pastries[index]._id },
                        name: pastries[index].name,
                        numberOfPastries: pastries[index].quantityWon
                    });
                }
                await pastries[index].save();
            }
        }));

        if (user) {
            await user.save();
        }

        res.status(200).json({ pastries, message: 'double' });
    } catch (err) {
        console.error('Error updating Double:', err);
        res.status(500).json({ message: 'Error updating Double', err });
    }
}

// Utility function to get random unique indices
function getRandomIndices(maxRange: number, n: number): number[] {
    const indices: number[] = [];
    while (indices.length < n) {
        const index = Math.floor(Math.random() * maxRange);
        if (!indices.includes(index)) {
            indices.push(index);
        }
    }
    return indices;
}
