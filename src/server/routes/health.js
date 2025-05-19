const express = require('express');
const healthCore = require('../core/health'); // Adjusted path

const router = express.Router();

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
router.get('/', async (req, res, next) => {
    try {
        const healthStatus = await healthCore.checkHealth();
        res.status(200).json(healthStatus);
    } catch (error) {
        // Pass error to a centralized error handler
        next(error);
    }
});

module.exports = router;
