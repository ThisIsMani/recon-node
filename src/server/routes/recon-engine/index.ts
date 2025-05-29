import express, { Router, Request, Response } from 'express';
import { runManualTrigger, ManualTriggerResult } from '../../core/recon-engine/consumer';
import logger from '../../../services/logger';
import { BusinessLogicError } from '../../../errors';

const router: Router = express.Router();

/**
 * @swagger
 * /recon-engine/trigger:
 *   post:
 *     summary: Manually trigger the recon engine
 *     description: |
 *       Triggers the recon engine to process all pending staging entries.
 *       The engine will continue processing until all pending entries are consumed,
 *       then automatically stop. This endpoint is useful for batch processing or
 *       when you need immediate processing without waiting for the automatic consumer.
 *     tags:
 *       - Recon Engine
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeoutMs:
 *                 type: number
 *                 description: Maximum time to run in milliseconds
 *                 default: 300000
 *                 minimum: 1000
 *                 maximum: 3600000
 *                 example: 300000
 *     responses:
 *       200:
 *         description: Processing completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processed:
 *                   type: number
 *                   description: Total number of tasks processed
 *                   example: 42
 *                 succeeded:
 *                   type: number
 *                   description: Number of tasks that succeeded
 *                   example: 40
 *                 failed:
 *                   type: number
 *                   description: Number of tasks that failed
 *                   example: 2
 *                 duration:
 *                   type: number
 *                   description: Total processing time in milliseconds
 *                   example: 12345
 *                 error:
 *                   type: string
 *                   description: Error message if the process was interrupted
 *                   example: "Manual trigger timed out after 300000ms"
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid timeout value"
 *       409:
 *         description: Conflict - engine is already running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Cannot run manual trigger while consumer is already running"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { timeoutMs } = req.body || {};
    
    // Validate timeout if provided
    if (timeoutMs !== undefined) {
      const timeout = Number(timeoutMs);
      if (isNaN(timeout) || timeout < 1000 || timeout > 3600000) {
        throw new BusinessLogicError('Invalid timeout value. Must be between 1000ms and 3600000ms (1 hour)');
      }
    }
    
    logger.info('Recon Engine API: Manual trigger requested', { timeoutMs });
    
    // Run the manual trigger
    const result: ManualTriggerResult = await runManualTrigger(timeoutMs);
    
    // Log the result
    logger.info('Recon Engine API: Manual trigger completed', result);
    
    // Return appropriate status code based on whether there was an error
    const statusCode = result.error ? 206 : 200; // 206 Partial Content if there was an error
    
    res.status(statusCode).json(result);
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('already running') || error.message.includes('already in progress')) {
        logger.warn('Recon Engine API: Trigger conflict', { error: error.message });
        res.status(409).json({ error: error.message });
        return;
      }
      
      if (error instanceof BusinessLogicError) {
        logger.warn('Recon Engine API: Bad request', { error: error.message });
        res.status(400).json({ error: error.message });
        return;
      }
    }
    
    // Generic error handling
    logger.error('Recon Engine API: Manual trigger failed', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /recon-engine/status:
 *   get:
 *     summary: Get recon engine status
 *     description: Returns the current status of the recon engine consumer
 *     tags:
 *       - Recon Engine
 *     responses:
 *       200:
 *         description: Current engine status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [idle, running, manual_trigger_in_progress]
 *                   description: Current status of the recon engine
 *                   example: "idle"
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Import consumer state (would need to export these from consumer.ts)
    // For now, returning a simple response
    res.json({ 
      status: 'idle',
      message: 'Status endpoint implementation pending' 
    });
  } catch (error) {
    logger.error('Recon Engine API: Status check failed', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as reconEngineRouter };