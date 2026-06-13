const logger = require('../config/logger');

// AI-powered quotation service with rule-based logic
class AIQuotationService {
  constructor() {
    this.baseRates = {
      flat_tire: { min: 500, max: 1500, base: 800 },
      battery_dead: { min: 300, max: 800, base: 500 },
      engine_trouble: { min: 1000, max: 5000, base: 2000 },
      fuel_empty: { min: 200, max: 500, base: 300 },
      key_locked: { min: 400, max: 1000, base: 600 },
      accident: { min: 2000, max: 10000, base: 4000 },
      overheating: { min: 800, max: 2500, base: 1200 },
      brake_failure: { min: 1500, max: 4000, base: 2200 },
      transmission_issue: { min: 2000, max: 8000, base: 3500 },
      other: { min: 500, max: 2000, base: 1000 }
    };

    this.vehicleMultipliers = {
      car: 1.0,
      motorcycle: 0.7,
      truck: 1.5,
      bus: 1.8,
      other: 1.2
    };

    this.priorityMultipliers = {
      low: 0.8,
      medium: 1.0,
      high: 1.3,
      emergency: 1.8
    };

    this.timeMultipliers = {
      peak: 1.4,      // 7-10 AM, 5-8 PM
      normal: 1.0,    // 10 AM - 5 PM
      night: 1.6,     // 8 PM - 7 AM
      weekend: 1.2    // Saturday, Sunday
    };

    this.weatherMultipliers = {
      clear: 1.0,
      rain: 1.3,
      storm: 1.6,
      fog: 1.2,
      snow: 1.8
    };
  }

  // Generate intelligent quotation based on multiple factors
  async generateQuotation(serviceRequest, additionalFactors = {}) {
    try {
      const {
        issueType,
        vehicleInfo,
        priority = 'medium',
        location,
        description = ''
      } = serviceRequest;

      const {
        mechanicRating = 4.0,
        distance = 5,
        timeOfDay = new Date(),
        weather = 'clear',
        complexity = 'medium'
      } = additionalFactors;

      // Get base rate for issue type
      const baseRate = this.baseRates[issueType] || this.baseRates.other;
      let quotation = baseRate.base;

      // Apply vehicle type multiplier
      const vehicleMultiplier = this.vehicleMultipliers[vehicleInfo.type] || 1.0;
      quotation *= vehicleMultiplier;

      // Apply priority multiplier
      const priorityMultiplier = this.priorityMultipliers[priority] || 1.0;
      quotation *= priorityMultiplier;

      // Apply time-based multiplier
      const timeMultiplier = this.getTimeMultiplier(timeOfDay);
      quotation *= timeMultiplier;

      // Apply weather multiplier
      const weatherMultiplier = this.weatherMultipliers[weather] || 1.0;
      quotation *= weatherMultiplier;

      // Apply distance multiplier (travel cost)
      const distanceMultiplier = 1 + (distance * 0.05); // 5% per km
      quotation *= distanceMultiplier;

      // Apply mechanic rating multiplier (higher rated = higher cost)
      const ratingMultiplier = 0.8 + (mechanicRating * 0.1); // 0.8 to 1.3x
      quotation *= ratingMultiplier;

      // Apply complexity multiplier based on description analysis
      const complexityMultiplier = this.analyzeComplexity(description, issueType);
      quotation *= complexityMultiplier;

      // Apply location-based multiplier (urban vs rural)
      const locationMultiplier = await this.getLocationMultiplier(location);
      quotation *= locationMultiplier;

      // Round to nearest 50 and ensure within bounds
      quotation = Math.round(quotation / 50) * 50;
      quotation = Math.max(baseRate.min, Math.min(baseRate.max, quotation));

      // Generate confidence score
      const confidence = this.calculateConfidence(serviceRequest, additionalFactors);

      // Generate estimation range
      const range = {
        min: Math.round(quotation * 0.8),
        max: Math.round(quotation * 1.2),
        estimated: quotation
      };

      logger.info('Quotation generated:', {
        issueType,
        vehicleType: vehicleInfo.type,
        priority,
        baseAmount: baseRate.base,
        finalAmount: quotation,
        factors: {
          vehicle: vehicleMultiplier,
          priority: priorityMultiplier,
          time: timeMultiplier,
          weather: weatherMultiplier,
          distance: distanceMultiplier,
          rating: ratingMultiplier,
          complexity: complexityMultiplier,
          location: locationMultiplier
        }
      });

      return {
        quotation,
        range,
        confidence,
        breakdown: this.generateBreakdown(baseRate.base, quotation, {
          vehicleMultiplier,
          priorityMultiplier,
          timeMultiplier,
          weatherMultiplier,
          distanceMultiplier,
          ratingMultiplier,
          complexityMultiplier,
          locationMultiplier
        }),
        estimatedDuration: this.estimateDuration(issueType, complexity),
        recommendations: this.generateRecommendations(issueType, quotation)
      };

    } catch (error) {
      logger.error('Error generating quotation:', error);
      
      // Fallback to basic calculation
      const baseRate = this.baseRates[serviceRequest.issueType] || this.baseRates.other;
      return {
        quotation: baseRate.base,
        range: {
          min: baseRate.min,
          max: baseRate.max,
          estimated: baseRate.base
        },
        confidence: 0.6,
        breakdown: null,
        estimatedDuration: 60,
        recommendations: []
      };
    }
  }

  // Analyze complexity from description
  analyzeComplexity(description, issueType) {
    const complexityKeywords = {
      high: [
        'multiple', 'several', 'many', 'complex', 'complicated', 'severe',
        'major', 'extensive', 'complete', 'total', 'broken', 'damaged',
        'leaking', 'smoking', 'burning', 'noise', 'strange', 'unusual'
      ],
      medium: [
        'some', 'partial', 'intermittent', 'sometimes', 'occasional',
        'minor', 'small', 'slight', 'little'
      ],
      low: [
        'simple', 'easy', 'basic', 'quick', 'fast', 'minor', 'small'
      ]
    };

    const text = description.toLowerCase();
    let highCount = 0, mediumCount = 0, lowCount = 0;

    complexityKeywords.high.forEach(keyword => {
      if (text.includes(keyword)) highCount++;
    });

    complexityKeywords.medium.forEach(keyword => {
      if (text.includes(keyword)) mediumCount++;
    });

    complexityKeywords.low.forEach(keyword => {
      if (text.includes(keyword)) lowCount++;
    });

    // Emergency issues are inherently complex
    if (issueType === 'accident' || issueType === 'brake_failure') {
      highCount += 2;
    }

    if (highCount > mediumCount && highCount > lowCount) {
      return 1.4; // High complexity
    } else if (lowCount > mediumCount && lowCount > highCount) {
      return 0.8; // Low complexity
    }
    
    return 1.0; // Medium complexity
  }

  // Get time-based multiplier
  getTimeMultiplier(timeOfDay) {
    const hour = timeOfDay.getHours();
    const day = timeOfDay.getDay();

    // Weekend multiplier
    if (day === 0 || day === 6) {
      return this.timeMultipliers.weekend;
    }

    // Peak hours (7-10 AM, 5-8 PM)
    if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) {
      return this.timeMultipliers.peak;
    }

    // Night hours (8 PM - 7 AM)
    if (hour >= 20 || hour < 7) {
      return this.timeMultipliers.night;
    }

    // Normal hours
    return this.timeMultipliers.normal;
  }

  // Get location-based multiplier (mock implementation)
  async getLocationMultiplier(location) {
    // In a real implementation, this would use geocoding APIs
    // to determine if the location is urban, suburban, or rural
    
    // Mock logic based on coordinates
    // Urban areas typically have higher costs
    const { lat, lng } = location;
    
    // Major city centers (higher cost)
    const majorCities = [
      { lat: 28.6139, lng: 77.2090, name: 'Delhi' },
      { lat: 19.0760, lng: 72.8777, name: 'Mumbai' },
      { lat: 12.9716, lng: 77.5946, name: 'Bangalore' },
      { lat: 13.0827, lng: 80.2707, name: 'Chennai' }
    ];

    const nearMajorCity = majorCities.some(city => {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      return distance < 20; // Within 20km of major city
    });

    if (nearMajorCity) {
      return 1.3; // Urban premium
    }

    // Suburban areas
    const nearSuburban = majorCities.some(city => {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      return distance >= 20 && distance < 50;
    });

    if (nearSuburban) {
      return 1.1; // Suburban premium
    }

    // Rural areas (lower cost but higher travel)
    return 1.0;
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate confidence score
  calculateConfidence(serviceRequest, additionalFactors) {
    let confidence = 0.7; // Base confidence

    // More data = higher confidence
    if (serviceRequest.description && serviceRequest.description.length > 50) {
      confidence += 0.1;
    }

    if (serviceRequest.images && serviceRequest.images.length > 0) {
      confidence += 0.1;
    }

    if (additionalFactors.mechanicRating && additionalFactors.mechanicRating >= 4.0) {
      confidence += 0.05;
    }

    if (additionalFactors.weather && additionalFactors.weather !== 'clear') {
      confidence -= 0.05; // Weather uncertainty
    }

    return Math.min(0.95, Math.max(0.5, confidence));
  }

  // Generate cost breakdown
  generateBreakdown(baseAmount, finalAmount, multipliers) {
    return {
      baseService: baseAmount,
      vehicleType: Math.round((multipliers.vehicleMultiplier - 1) * baseAmount),
      priority: Math.round((multipliers.priorityMultiplier - 1) * baseAmount),
      timeOfDay: Math.round((multipliers.timeMultiplier - 1) * baseAmount),
      weather: Math.round((multipliers.weatherMultiplier - 1) * baseAmount),
      distance: Math.round((multipliers.distanceMultiplier - 1) * baseAmount),
      mechanicRating: Math.round((multipliers.ratingMultiplier - 1) * baseAmount),
      complexity: Math.round((multipliers.complexityMultiplier - 1) * baseAmount),
      location: Math.round((multipliers.locationMultiplier - 1) * baseAmount),
      total: finalAmount
    };
  }

  // Estimate service duration
  estimateDuration(issueType, complexity = 'medium') {
    const baseDurations = {
      flat_tire: 30,
      battery_dead: 20,
      engine_trouble: 90,
      fuel_empty: 15,
      key_locked: 25,
      accident: 120,
      overheating: 60,
      brake_failure: 80,
      transmission_issue: 150,
      other: 45
    };

    const complexityMultipliers = {
      low: 0.7,
      medium: 1.0,
      high: 1.5
    };

    const baseDuration = baseDurations[issueType] || 45;
    const complexityMultiplier = complexityMultipliers[complexity] || 1.0;

    return Math.round(baseDuration * complexityMultiplier);
  }

  // Generate service recommendations
  generateRecommendations(issueType, quotation) {
    const recommendations = [];

    if (quotation > 3000) {
      recommendations.push({
        type: 'cost_saving',
        message: 'Consider getting a second opinion for high-cost repairs',
        priority: 'medium'
      });
    }

    if (issueType === 'accident') {
      recommendations.push({
        type: 'safety',
        message: 'Ensure vehicle is in a safe location and hazard lights are on',
        priority: 'high'
      });
    }

    if (issueType === 'battery_dead') {
      recommendations.push({
        type: 'prevention',
        message: 'Consider battery replacement if it\'s over 3 years old',
        priority: 'low'
      });
    }

    if (issueType === 'fuel_empty') {
      recommendations.push({
        type: 'quick_fix',
        message: 'Service includes fuel delivery. No towing required.',
        priority: 'info'
      });
    }

    return recommendations;
  }

  // Bulk quotation for multiple requests
  async generateBulkQuotations(serviceRequests, commonFactors = {}) {
    const results = [];

    for (const request of serviceRequests) {
      try {
        const quotation = await this.generateQuotation(request, commonFactors);
        results.push({
          requestId: request._id,
          success: true,
          quotation
        });
      } catch (error) {
        results.push({
          requestId: request._id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Update rates based on market data (admin function)
  updateRates(issueType, newRates) {
    if (this.baseRates[issueType]) {
      this.baseRates[issueType] = { ...this.baseRates[issueType], ...newRates };
      logger.info(`Updated rates for ${issueType}:`, this.baseRates[issueType]);
      return true;
    }
    return false;
  }

  // Get current rates
  getRates() {
    return {
      baseRates: this.baseRates,
      vehicleMultipliers: this.vehicleMultipliers,
      priorityMultipliers: this.priorityMultipliers,
      timeMultipliers: this.timeMultipliers,
      weatherMultipliers: this.weatherMultipliers
    };
  }
}

module.exports = new AIQuotationService();
