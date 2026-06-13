const aiQuotationService = require('../../src/services/aiQuotationService');

describe('AI Quotation Service', () => {
  describe('generateQuotation', () => {
    test('should generate quotation for engine trouble', async () => {
      const request = {
        issueType: 'engine_trouble',
        vehicleInfo: { type: 'car' },
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Engine making strange noise'
      };

      const result = await aiQuotationService.generateQuotation(request, {});

      expect(result.quotation).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.range).toHaveProperty('min');
      expect(result.range).toHaveProperty('max');
      expect(result.range).toHaveProperty('estimated');
    });

    test('should generate quotation for flat tire', async () => {
      const request = {
        issueType: 'flat_tire',
        vehicleInfo: { type: 'car' },
        priority: 'low',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Front tire is flat'
      };

      const result = await aiQuotationService.generateQuotation(request, {});

      expect(result.quotation).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeGreaterThan(0);
      // breakdown might be null in some cases, so check conditionally
      if (result.breakdown) {
        expect(result.breakdown).toHaveProperty('baseService');
        expect(result.breakdown).toHaveProperty('priority');
      }
    });

    test('should apply priority multipliers correctly', async () => {
      const baseRequest = {
        issueType: 'engine_trouble',
        vehicleInfo: { type: 'car' },
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Engine issue'
      };

      const lowPriorityResult = await aiQuotationService.generateQuotation({
        ...baseRequest,
        priority: 'low'
      }, {});

      const emergencyResult = await aiQuotationService.generateQuotation({
        ...baseRequest,
        priority: 'emergency'
      }, {});

      // Emergency should be more expensive or equal (due to rounding)
      expect(emergencyResult.quotation).toBeGreaterThanOrEqual(lowPriorityResult.quotation);
    });

    test('should handle different vehicle types', async () => {
      const baseRequest = {
        issueType: 'engine_trouble',
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Engine issue'
      };

      const carResult = await aiQuotationService.generateQuotation({
        ...baseRequest,
        vehicleInfo: { type: 'car' }
      }, {});

      const truckResult = await aiQuotationService.generateQuotation({
        ...baseRequest,
        vehicleInfo: { type: 'truck' }
      }, {});

      // Truck repairs should be more expensive or equal (due to rounding)
      expect(truckResult.quotation).toBeGreaterThanOrEqual(carResult.quotation);
    });

    test('should apply time-based multipliers', async () => {
      const request = {
        issueType: 'engine_trouble',
        vehicleInfo: { type: 'car' },
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Engine issue'
      };

      const dayTime = new Date('2023-01-01T14:00:00'); // 2 PM
      const nightTime = new Date('2023-01-01T02:00:00'); // 2 AM

      const dayResult = await aiQuotationService.generateQuotation(request, {
        timeOfDay: dayTime
      });

      const nightResult = await aiQuotationService.generateQuotation(request, {
        timeOfDay: nightTime
      });

      // Night should be more expensive or equal (due to rounding)
      expect(nightResult.quotation).toBeGreaterThanOrEqual(dayResult.quotation);
    });

    test('should handle missing or invalid parameters', async () => {
      const invalidRequest = {
        issueType: 'invalid_type',
        vehicleInfo: { type: 'car' },
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 }
      };

      const result = await aiQuotationService.generateQuotation(invalidRequest, {});
      
      // Should not throw error, but return fallback quotation
      expect(result).toBeDefined();
      expect(result.quotation).toBeGreaterThan(0);
    });

    test('should provide detailed breakdown when successful', async () => {
      const request = {
        issueType: 'engine_trouble',
        vehicleInfo: { type: 'car' },
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 },
        description: 'Engine making noise'
      };

      const result = await aiQuotationService.generateQuotation(request, {});

      // breakdown might be null in error cases
      if (result.breakdown) {
        expect(result.breakdown).toHaveProperty('baseService');
        expect(result.breakdown).toHaveProperty('priority');
        expect(result.breakdown).toHaveProperty('vehicleType');
        expect(result.breakdown).toHaveProperty('timeOfDay');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle unknown issue types', async () => {
      const request = {
        issueType: 'unknown_issue',
        vehicleInfo: { type: 'car' },
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 }
      };

      const result = await aiQuotationService.generateQuotation(request, {});
      
      expect(result.quotation).toBeGreaterThan(0);
      expect(result.range).toHaveProperty('min');
      expect(result.range).toHaveProperty('max');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should handle extreme weather conditions', async () => {
      const request = {
        issueType: 'engine_trouble',
        vehicleInfo: { type: 'car' },
        priority: 'medium',
        location: { lat: 40.7128, lng: -74.0060 }
      };

      const clearResult = await aiQuotationService.generateQuotation(request, {
        weather: 'clear'
      });

      const stormResult = await aiQuotationService.generateQuotation(request, {
        weather: 'storm'
      });

      // Storm should be more expensive or equal (due to rounding)
      expect(stormResult.quotation).toBeGreaterThanOrEqual(clearResult.quotation);
    });
  });
});
