const authService = require('../services/authService');
const { loginSchema } = require('../validators/authValidator');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData.email, validatedData.password);
      return ApiResponse.success(res, 200, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getUserProfile(req.user.id);
      return ApiResponse.success(res, 200, 'User profile retrieved successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/admin-only
   * Demonstration endpoint for RBAC verification
   */
  async adminOnlyCheck(req, res, next) {
    try {
      return ApiResponse.success(res, 200, 'Admin authorization verified successfully', {
        granted: true,
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
