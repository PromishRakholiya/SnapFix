const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

class CSVExportService {
  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.initializeExportDirectory();
  }

  async initializeExportDirectory() {
    try {
      await fs.access(this.exportDir);
    } catch {
      await fs.mkdir(this.exportDir, { recursive: true });
    }
  }

  // Export service requests to CSV
  async exportServiceRequests(data, filename = null) {
    try {
      const fileName = filename || `service-requests-${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'requestId', title: 'Request ID' },
          { id: 'customerName', title: 'Customer Name' },
          { id: 'customerPhone', title: 'Customer Phone' },
          { id: 'mechanicName', title: 'Mechanic Name' },
          { id: 'mechanicPhone', title: 'Mechanic Phone' },
          { id: 'issueType', title: 'Issue Type' },
          { id: 'vehicleType', title: 'Vehicle Type' },
          { id: 'vehicleModel', title: 'Vehicle Model' },
          { id: 'status', title: 'Status' },
          { id: 'priority', title: 'Priority' },
          { id: 'quotation', title: 'Quotation (₹)' },
          { id: 'location', title: 'Location' },
          { id: 'createdAt', title: 'Created At' },
          { id: 'completedAt', title: 'Completed At' },
          { id: 'duration', title: 'Duration (minutes)' }
        ]
      });

      const records = data.map(request => ({
        requestId: request._id.toString(),
        customerName: request.customerId?.name || 'N/A',
        customerPhone: request.customerId?.phone || 'N/A',
        mechanicName: request.mechanicId?.name || 'Not Assigned',
        mechanicPhone: request.mechanicId?.phone || 'N/A',
        issueType: request.issueType,
        vehicleType: request.vehicleInfo?.type || 'N/A',
        vehicleModel: request.vehicleInfo?.model || 'N/A',
        status: request.status,
        priority: request.priority,
        quotation: request.quotation || 0,
        location: request.location?.address || `${request.location?.lat}, ${request.location?.lng}`,
        createdAt: request.createdAt.toISOString(),
        completedAt: request.completedAt?.toISOString() || 'N/A',
        duration: request.actualDuration || 'N/A'
      }));

      await csvWriter.writeRecords(records);

      logger.info('Service requests exported to CSV:', {
        fileName,
        recordCount: records.length
      });

      return {
        fileName,
        filePath,
        recordCount: records.length
      };

    } catch (error) {
      logger.error('CSV export failed:', error);
      throw error;
    }
  }

  // Export payments to CSV
  async exportPayments(data, filename = null) {
    try {
      const fileName = filename || `payments-${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'paymentId', title: 'Payment ID' },
          { id: 'requestId', title: 'Request ID' },
          { id: 'customerName', title: 'Customer Name' },
          { id: 'mechanicName', title: 'Mechanic Name' },
          { id: 'amount', title: 'Amount (₹)' },
          { id: 'processingFee', title: 'Processing Fee (₹)' },
          { id: 'netAmount', title: 'Net Amount (₹)' },
          { id: 'method', title: 'Payment Method' },
          { id: 'status', title: 'Status' },
          { id: 'transactionId', title: 'Transaction ID' },
          { id: 'receipt', title: 'Receipt Number' },
          { id: 'paidAt', title: 'Paid At' },
          { id: 'createdAt', title: 'Created At' }
        ]
      });

      const records = data.map(payment => ({
        paymentId: payment._id.toString(),
        requestId: payment.requestId?._id?.toString() || payment.requestId,
        customerName: payment.customerId?.name || 'N/A',
        mechanicName: payment.mechanicId?.name || 'N/A',
        amount: payment.amount,
        processingFee: payment.processingFee || 0,
        netAmount: payment.netAmount || payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId || payment.razorpayPaymentId || 'N/A',
        receipt: payment.receipt || 'N/A',
        paidAt: payment.paidAt?.toISOString() || 'N/A',
        createdAt: payment.createdAt.toISOString()
      }));

      await csvWriter.writeRecords(records);

      logger.info('Payments exported to CSV:', {
        fileName,
        recordCount: records.length
      });

      return {
        fileName,
        filePath,
        recordCount: records.length
      };

    } catch (error) {
      logger.error('Payment CSV export failed:', error);
      throw error;
    }
  }

  // Export users to CSV
  async exportUsers(data, filename = null) {
    try {
      const fileName = filename || `users-${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, fileName);

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'userId', title: 'User ID' },
          { id: 'name', title: 'Name' },
          { id: 'email', title: 'Email' },
          { id: 'phone', title: 'Phone' },
          { id: 'role', title: 'Role' },
          { id: 'rating', title: 'Rating' },
          { id: 'totalReviews', title: 'Total Reviews' },
          { id: 'isActive', title: 'Active' },
          { id: 'isVerified', title: 'Verified' },
          { id: 'location', title: 'Location' },
          { id: 'vehicleCount', title: 'Vehicle Count' },
          { id: 'lastLogin', title: 'Last Login' },
          { id: 'createdAt', title: 'Registered At' }
        ]
      });

      const records = data.map(user => ({
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rating: user.rating || 0,
        totalReviews: user.totalReviews || 0,
        isActive: user.isActive ? 'Yes' : 'No',
        isVerified: user.isVerified ? 'Yes' : 'No',
        location: user.location ? `${user.location.lat}, ${user.location.lng}` : 'N/A',
        vehicleCount: user.vehicles?.length || 0,
        lastLogin: user.lastLogin?.toISOString() || 'Never',
        createdAt: user.createdAt.toISOString()
      }));

      await csvWriter.writeRecords(records);

      logger.info('Users exported to CSV:', {
        fileName,
        recordCount: records.length
      });

      return {
        fileName,
        filePath,
        recordCount: records.length
      };

    } catch (error) {
      logger.error('User CSV export failed:', error);
      throw error;
    }
  }

  // Export to Excel format
  async exportToExcel(data, sheetName, filename = null) {
    try {
      const fileName = filename || `${sheetName.toLowerCase()}-${Date.now()}.xlsx`;
      const filePath = path.join(this.exportDir, fileName);

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const columnWidths = [];
      const headers = Object.keys(data[0] || {});
      headers.forEach((header, index) => {
        const maxLength = Math.max(
          header.length,
          ...data.map(row => String(row[header] || '').length)
        );
        columnWidths[index] = { width: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, filePath);

      logger.info('Data exported to Excel:', {
        fileName,
        sheetName,
        recordCount: data.length
      });

      return {
        fileName,
        filePath,
        recordCount: data.length
      };

    } catch (error) {
      logger.error('Excel export failed:', error);
      throw error;
    }
  }

  // Export analytics report
  async exportAnalyticsReport(analyticsData, filename = null) {
    try {
      const fileName = filename || `analytics-report-${Date.now()}.xlsx`;
      const filePath = path.join(this.exportDir, fileName);

      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        { Metric: 'Total Requests', Value: analyticsData.totalRequests || 0 },
        { Metric: 'Completed Requests', Value: analyticsData.completedRequests || 0 },
        { Metric: 'Completion Rate (%)', Value: analyticsData.completionRate || 0 },
        { Metric: 'Average Response Time (min)', Value: analyticsData.avgResponseTime || 0 },
        { Metric: 'Average Resolution Time (min)', Value: analyticsData.avgResolutionTime || 0 },
        { Metric: 'Total Revenue (₹)', Value: analyticsData.totalRevenue || 0 },
        { Metric: 'Active Mechanics', Value: analyticsData.activeMechanics || 0 },
        { Metric: 'Active Customers', Value: analyticsData.activeCustomers || 0 }
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Request trends sheet
      if (analyticsData.requestTrends) {
        const trendsSheet = XLSX.utils.json_to_sheet(analyticsData.requestTrends);
        XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Request Trends');
      }

      // Issue type breakdown
      if (analyticsData.issueTypeBreakdown) {
        const issueSheet = XLSX.utils.json_to_sheet(analyticsData.issueTypeBreakdown);
        XLSX.utils.book_append_sheet(workbook, issueSheet, 'Issue Types');
      }

      // Top mechanics
      if (analyticsData.topMechanics) {
        const mechanicsSheet = XLSX.utils.json_to_sheet(analyticsData.topMechanics);
        XLSX.utils.book_append_sheet(workbook, mechanicsSheet, 'Top Mechanics');
      }

      XLSX.writeFile(workbook, filePath);

      logger.info('Analytics report exported:', {
        fileName,
        sheets: ['Summary', 'Request Trends', 'Issue Types', 'Top Mechanics']
      });

      return {
        fileName,
        filePath,
        sheets: workbook.SheetNames.length
      };

    } catch (error) {
      logger.error('Analytics export failed:', error);
      throw error;
    }
  }

  // Clean up old export files
  async cleanupOldExports(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.exportDir);
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old export files`);
      return deletedCount;

    } catch (error) {
      logger.error('Export cleanup failed:', error);
      return 0;
    }
  }

  // Get available export files
  async getAvailableExports() {
    try {
      const files = await fs.readdir(this.exportDir);
      const exports = [];

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.stat(filePath);
        
        exports.push({
          fileName: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }

      return exports.sort((a, b) => b.modifiedAt - a.modifiedAt);

    } catch (error) {
      logger.error('Failed to get available exports:', error);
      return [];
    }
  }

  // Delete specific export file
  async deleteExport(fileName) {
    try {
      const filePath = path.join(this.exportDir, fileName);
      await fs.unlink(filePath);
      
      logger.info('Export file deleted:', fileName);
      return true;

    } catch (error) {
      logger.error('Failed to delete export file:', error);
      return false;
    }
  }
}

module.exports = new CSVExportService();
