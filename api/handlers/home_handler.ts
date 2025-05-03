import { Request, Response, Router } from "express"

export const helloWorld = async (req: Request, res: Response) => {

    try {
        res.status(200).json({ message: 'Hello from the server!' })
    } catch (error) {
        console.error('Error:', error)
        res.status(500).json({ error: 'Failed to connect to the API' })
    }
}