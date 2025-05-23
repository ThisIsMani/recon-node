import express, { Router, Request, Response, NextFunction } from 'express';
import * as healthCore from '../core/health'; // Using * as import for CommonJS module

const router: Router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API and Database Health
 *     description: Returns the current operational status of the API and its connection to the database.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Successful health check.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-05-19T12:00:00.000Z"
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: connected
 *       500:
 *         description: Internal server error during health check.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatus = await healthCore.checkHealth();
    res.status(200).json(healthStatus);
  } catch (error) {
    next(error);
  }
});

export default router;
