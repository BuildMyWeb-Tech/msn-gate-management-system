const erpAuthService = require("../services/erpAuthService");
const { validateLogin } = require("../utils/validate");

exports.login = async (req, res, next) => {
  try {
    const error = validateLogin(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    const { username, password } = req.body;

    const result = await erpAuthService.login(username, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err); // ✅ ADD THIS
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
};


// TEMP APIs
exports.register = async (req, res) => {
  res.json({
    success: true,
    message: "Register API working"
  });
};

exports.changePassword = async (req, res) => {
  res.json({
    success: true,
    message: "Change password API working"
  });
};

exports.getMe = async (req, res) => {
  res.json({
    success: true,
    message: "GetMe API working"
  });
};