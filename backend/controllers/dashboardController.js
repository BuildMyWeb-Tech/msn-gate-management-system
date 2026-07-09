const dashboardService = require("../services/dashboardService");

exports.getDashboard = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const data = await dashboardService.getDashboardData(userId);

    res.json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};