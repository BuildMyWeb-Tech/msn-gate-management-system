const menuRepo = require("../repositories/menuRepo");

async function getDashboardData(userId) {
  const rows = await menuRepo.getUserMenus(userId);

  const modules = new Set();
  let totalSubMenus = 0;

  for (const row of rows) {
    const parent = row.menuname;
    const sub = row.SubMenuName;

    if (parent) modules.add(parent);
    if (sub) totalSubMenus++;
  }

  return {
    totalModules: modules.size,
    totalSubMenus
  };
}

module.exports = { getDashboardData };