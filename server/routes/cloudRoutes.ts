import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertCloudResourceSchema, insertCloudConnectionSchema } from '../../shared/schema';

const router = Router();

// Cloud Resources
router.get('/cloud-resources', async (req, res) => {
  try {
    const resources = await storage.getAllCloudResources();
    res.json(resources);
  } catch (error: any) {
    console.error('Error fetching cloud resources:', error);
    res.status(500).json({ error: 'Failed to fetch cloud resources' });
  }
});

router.get('/cloud-resources/:id', async (req, res) => {
  try {
    const resource = await storage.getCloudResource(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Cloud resource not found' });
    }
    res.json(resource);
  } catch (error: any) {
    console.error('Error fetching cloud resource:', error);
    res.status(500).json({ error: 'Failed to fetch cloud resource' });
  }
});

router.get('/cloud-resources/provider/:provider', async (req, res) => {
  try {
    const resources = await storage.getCloudResourcesByProvider(req.params.provider);
    res.json(resources);
  } catch (error: any) {
    console.error('Error fetching cloud resources by provider:', error);
    res.status(500).json({ error: 'Failed to fetch cloud resources' });
  }
});

router.post('/cloud-resources', async (req, res) => {
  try {
    const validatedData = insertCloudResourceSchema.parse(req.body);
    const resource = await storage.createCloudResource(validatedData);
    res.status(201).json(resource);
  } catch (error: any) {
    console.error('Error creating cloud resource:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid cloud resource data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create cloud resource' });
  }
});

router.put('/cloud-resources/:id', async (req, res) => {
  try {
    const partialData = insertCloudResourceSchema.partial().parse(req.body);
    await storage.updateCloudResource(req.params.id, partialData);
    const updatedResource = await storage.getCloudResource(req.params.id);
    res.json(updatedResource);
  } catch (error: any) {
    console.error('Error updating cloud resource:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid cloud resource data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update cloud resource' });
  }
});

router.delete('/cloud-resources/:id', async (req, res) => {
  try {
    await storage.deleteCloudResource(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting cloud resource:', error);
    res.status(500).json({ error: 'Failed to delete cloud resource' });
  }
});

// Cloud Metrics
router.get('/cloud-metrics/:resourceId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const metrics = await storage.getCloudMetrics(req.params.resourceId, limit);
    res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching cloud metrics:', error);
    res.status(500).json({ error: 'Failed to fetch cloud metrics' });
  }
});

router.get('/cloud-metrics/:resourceId/range', async (req, res) => {
  try {
    const startTime = new Date(req.query.startTime as string);
    const endTime = new Date(req.query.endTime as string);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const metrics = await storage.getCloudMetricsInTimeRange(req.params.resourceId, startTime, endTime);
    res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching cloud metrics range:', error);
    res.status(500).json({ error: 'Failed to fetch cloud metrics' });
  }
});

// Cloud Connections
router.get('/cloud-connections', async (req, res) => {
  try {
    const connections = await storage.getAllCloudConnections();
    // Don't return encrypted credentials in API responses
    const safeConnections = connections.map(conn => ({
      ...conn,
      encryptedCredentials: '[HIDDEN]',
    }));
    res.json(safeConnections);
  } catch (error: any) {
    console.error('Error fetching cloud connections:', error);
    res.status(500).json({ error: 'Failed to fetch cloud connections' });
  }
});

router.get('/cloud-connections/:id', async (req, res) => {
  try {
    const connection = await storage.getCloudConnection(req.params.id);
    if (!connection) {
      return res.status(404).json({ error: 'Cloud connection not found' });
    }
    
    // Don't return encrypted credentials in API responses
    const safeConnection = {
      ...connection,
      encryptedCredentials: '[HIDDEN]',
    };
    res.json(safeConnection);
  } catch (error: any) {
    console.error('Error fetching cloud connection:', error);
    res.status(500).json({ error: 'Failed to fetch cloud connection' });
  }
});

router.post('/cloud-connections', async (req, res) => {
  try {
    const validatedData = insertCloudConnectionSchema.parse(req.body);
    
    // In a real implementation, you'd encrypt the credentials here
    const connectionData = {
      ...validatedData,
      encryptedCredentials: JSON.stringify(validatedData.encryptedCredentials),
    };
    
    const connection = await storage.createCloudConnection(connectionData);
    
    // Don't return encrypted credentials in response
    const safeConnection = {
      ...connection,
      encryptedCredentials: '[HIDDEN]',
    };
    
    res.status(201).json(safeConnection);
  } catch (error: any) {
    console.error('Error creating cloud connection:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid cloud connection data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create cloud connection' });
  }
});

router.put('/cloud-connections/:id', async (req, res) => {
  try {
    const partialData = insertCloudConnectionSchema.partial().parse(req.body);
    
    // Handle credential encryption if provided
    if (partialData.encryptedCredentials) {
      partialData.encryptedCredentials = JSON.stringify(partialData.encryptedCredentials);
    }
    
    await storage.updateCloudConnection(req.params.id, partialData);
    const updatedConnection = await storage.getCloudConnection(req.params.id);
    
    if (!updatedConnection) {
      return res.status(404).json({ error: 'Cloud connection not found' });
    }
    
    // Don't return encrypted credentials in response
    const safeConnection = {
      ...updatedConnection,
      encryptedCredentials: '[HIDDEN]',
    };
    
    res.json(safeConnection);
  } catch (error: any) {
    console.error('Error updating cloud connection:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid cloud connection data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update cloud connection' });
  }
});

router.delete('/cloud-connections/:id', async (req, res) => {
  try {
    await storage.deleteCloudConnection(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting cloud connection:', error);
    res.status(500).json({ error: 'Failed to delete cloud connection' });
  }
});

// Test cloud connection
router.post('/cloud-connections/:id/test', async (req, res) => {
  try {
    const connection = await storage.getCloudConnection(req.params.id);
    if (!connection) {
      return res.status(404).json({ error: 'Cloud connection not found' });
    }

    // Test the connection based on provider
    let testResult = { success: false, message: 'Test not implemented for this provider' };
    
    if (connection.provider === 'aws') {
      const { AWSService } = await import('../services/awsService');
      const credentials = JSON.parse(connection.encryptedCredentials);
      const awsService = new AWSService({ ...credentials, region: connection.region });
      testResult = await awsService.testConnection();
    } else if (connection.provider === 'azure') {
      const { AzureService } = await import('../services/azureService');
      const credentials = JSON.parse(connection.encryptedCredentials);
      const azureService = new AzureService(credentials);
      testResult = await azureService.testConnection();
    }

    // Update connection with test result
    await storage.updateCloudConnection(req.params.id, {
      lastTestResult: {
        status: testResult.success ? 'success' : 'error',
        message: testResult.message,
        timestamp: new Date(),
      },
    });

    res.json(testResult);
  } catch (error: any) {
    console.error('Error testing cloud connection:', error);
    res.status(500).json({ error: 'Failed to test cloud connection' });
  }
});

// Trigger cloud discovery
router.post('/cloud-discovery/trigger', async (req, res) => {
  try {
    // This would trigger the cloud collector agent to run discovery
    // For now, we'll just return a success message
    res.json({ 
      success: true, 
      message: 'Cloud discovery triggered. Check agent logs for progress.' 
    });
  } catch (error: any) {
    console.error('Error triggering cloud discovery:', error);
    res.status(500).json({ error: 'Failed to trigger cloud discovery' });
  }
});

export default router;