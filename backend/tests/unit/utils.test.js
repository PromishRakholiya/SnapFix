const {
  calculateDistance,
  sendSuccessResponse,
  sendErrorResponse,
  getPaginationOptions,
  generatePaginationMeta,
  buildQueryFilter,
  buildSortOptions
} = require('../../src/utils/response');

describe('Utility Functions', () => {
  describe('calculateDistance', () => {
    test('should calculate distance between two coordinates', () => {
      // New York to Los Angeles coordinates
      const lat1 = 40.7128, lon1 = -74.0060; // New York
      const lat2 = 34.0522, lon2 = -118.2437; // Los Angeles
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      
      // Distance between NYC and LA is approximately 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    test('should return 0 for same coordinates', () => {
      const lat1 = 40.7128, lon1 = -74.0060;
      const lat2 = 40.7128, lon2 = -74.0060;
      
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      expect(distance).toBe(0);
    });

    test('should handle invalid coordinates', () => {
      const lat1 = null, lon1 = null;
      const lat2 = 40.7128, lon2 = -74.0060;
      
      // Function treats null as 0, so we expect a calculated distance
      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('getPaginationOptions', () => {
    test('should return default pagination options', () => {
      const query = {};
      const options = getPaginationOptions(query);
      
      expect(options).toEqual({
        page: 1,
        limit: 10,
        skip: 0
      });
    });

    test('should parse pagination from query', () => {
      const query = { page: '3', limit: '20' };
      const options = getPaginationOptions(query);
      
      expect(options).toEqual({
        page: 3,
        limit: 20,
        skip: 40
      });
    });

    test('should enforce maximum limit', () => {
      const query = { limit: '1000' };
      const options = getPaginationOptions(query);
      
      expect(options.limit).toBeLessThanOrEqual(100);
    });

    test('should handle invalid values', () => {
      const query = { page: 'invalid', limit: 'invalid' };
      const options = getPaginationOptions(query);
      
      expect(options).toEqual({
        page: 1,
        limit: 10,
        skip: 0
      });
    });
  });

  describe('generatePaginationMeta', () => {
    test('should generate correct pagination metadata', () => {
      const total = 25;
      const page = 2;
      const limit = 10;
      
      const meta = generatePaginationMeta(page, limit, total);
      
      expect(meta).toEqual({
        pagination: {
          currentPage: 2,
          totalPages: 3,
          totalItems: 25,
          itemsPerPage: 10,
          hasNextPage: true,
          hasPrevPage: true,
          nextPage: 3,
          prevPage: 1
        }
      });
    });

    test('should handle first page', () => {
      const meta = generatePaginationMeta(1, 10, 25);
      
      expect(meta.pagination.hasPrevPage).toBe(false);
      expect(meta.pagination.hasNextPage).toBe(true);
      expect(meta.pagination.prevPage).toBe(null);
    });

    test('should handle last page', () => {
      const meta = generatePaginationMeta(3, 10, 25);
      
      expect(meta.pagination.hasPrevPage).toBe(true);
      expect(meta.pagination.hasNextPage).toBe(false);
      expect(meta.pagination.nextPage).toBe(null);
    });
  });

  describe('buildQueryFilter', () => {
    test('should build query filter from parameters', () => {
      const params = {
        status: 'pending',
        priority: 'high',
        issueType: 'engine_trouble'
      };
      
      const filter = buildQueryFilter(params, ['status', 'priority', 'issueType']);
      
      expect(filter).toEqual({
        status: 'pending',
        priority: 'high',
        issueType: 'engine_trouble'
      });
    });

    test('should ignore non-allowed fields', () => {
      const params = {
        status: 'pending',
        maliciousField: 'hack',
        priority: 'high'
      };
      
      const filter = buildQueryFilter(params, ['status', 'priority']);
      
      expect(filter).toEqual({
        status: 'pending',
        priority: 'high'
      });
      expect(filter).not.toHaveProperty('maliciousField');
    });
  });

  describe('buildSortOptions', () => {
    test('should build sort options from query', () => {
      const query = { sortBy: 'createdAt', sortOrder: 'desc' };
      const sortOptions = buildSortOptions(query);
      
      expect(sortOptions).toEqual({ createdAt: -1 });
    });

    test('should handle ascending sort', () => {
      const query = { sortBy: 'name', sortOrder: 'asc' };
      const sortOptions = buildSortOptions(query);
      
      expect(sortOptions).toEqual({ name: 1 });
    });

    test('should use default sort', () => {
      const query = {};
      const sortOptions = buildSortOptions(query);
      
      expect(sortOptions).toEqual({ createdAt: -1 });
    });

    test('should use sortBy field even if not in allowed fields', () => {
      const query = { sortBy: 'invalidField', sortOrder: 'desc' };
      const sortOptions = buildSortOptions(query);
      
      expect(sortOptions).toEqual({ invalidField: -1 });
    });
  });
});
