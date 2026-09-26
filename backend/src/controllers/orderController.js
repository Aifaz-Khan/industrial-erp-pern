const orderService = require('../services/orderService');
const { dispatchOrderSchema } = require('../validators/orderValidator');
const ApiResponse = require('../utils/apiResponse');

class OrderController {
  async convertFromQuotation(req, res, next) {
    try {
      const order = await orderService.convertQuotationToSalesOrder(
        req.user.id,
        req.params.id
      );
      return ApiResponse.success(res, 201, 'Quotation converted into Sales Order successfully', { order });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const status = req.query.status || null;
      const orders = await orderService.getAllSalesOrders(status);
      return ApiResponse.success(res, 200, 'Sales Orders retrieved successfully', { orders });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const order = await orderService.getSalesOrderById(req.params.id);
      return ApiResponse.success(res, 200, 'Sales Order details retrieved successfully', { order });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req, res, next) {
    try {
      const order = await orderService.confirmSalesOrder(req.user.id, req.params.id);
      return ApiResponse.success(
        res,
        200,
        `Sales Order '${order.orderNumber}' confirmed and inventory reserved successfully`,
        { order }
      );
    } catch (error) {
      next(error);
    }
  }

  async dispatch(req, res, next) {
    try {
      const validatedData = dispatchOrderSchema.parse(req.body);
      const dispatch = await orderService.dispatchSalesOrder(
        req.user.id,
        req.params.id,
        validatedData
      );
      return ApiResponse.success(
        res,
        201,
        `Sales Order dispatched successfully under Dispatch Number '${dispatch.dispatchNumber}'`,
        { dispatch }
      );
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const order = await orderService.cancelSalesOrder(req.user.id, req.params.id);
      return ApiResponse.success(
        res,
        200,
        `Sales Order '${order.orderNumber}' cancelled and any reserved stock released`,
        { order }
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
