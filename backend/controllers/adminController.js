const menuService = require("../services/menuService");

// ========================
// ADMIN LOGIN (TEMP MOCK)
// ========================
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // TEMP response (replace with DB later)
    if (username === "admin" && password === "admin") {
      return res.json({
        success: true,
        token: "mock-token",
        adminId: 1
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid admin credentials"
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ========================
// GET ADMIN PROFILE
// ========================
exports.getAdminMe = async (req, res) => {
  return res.json({
    success: true,
    admin: {
      id: 1,
      name: "Super Admin"
    }
  });
};

// ========================
// COMPANIES (MOCK DATA)
// ========================
exports.getCompanies = async (req, res) => {
  return res.json([]);
};

exports.getCompanyById = async (req, res) => {
  return res.json({ id: req.params.id });
};

exports.approveCompany = async (req, res) => {
  return res.json({ success: true, message: "Company approved" });
};

exports.rejectCompany = async (req, res) => {
  return res.json({ success: true, message: "Company rejected" });
};

exports.resendCredentials = async (req, res) => {
  return res.json({ success: true, message: "Credentials sent" });
};

// ========================
// MENU (already used earlier)
// ========================
exports.getMenus = async (req, res) => {
  try {
    const { userId } = req.params;

    const menus = await menuService.getUserMenus(userId);

    return res.json(menus);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};