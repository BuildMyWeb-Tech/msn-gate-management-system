const repo = require("../repositories/menuRepo");

async function getGroupedMenus(userId) {
  const rows = await repo.getUserMenus(userId);

  const groups = {};

  for (const row of rows) {
    const parentMenu = row.menuname;
    const subName = row.SubMenuName;
    const subId = row.menudid;

    if (!parentMenu || !subName) continue;

    // 🔥 GET PERMISSIONS FROM NEW SP
    const rights = await repo.getMenuRights(userId, subId);

    const mWrite  = Number(rights?.MWrite ?? 0);
    const mUpdate = Number(rights?.MUpdate ?? 0);
    const mDelete = Number(rights?.MDelete ?? 0);

    if (!groups[parentMenu]) {
      groups[parentMenu] = {
        menu: parentMenu,
        subMenus: []
      };
    }

    groups[parentMenu].subMenus.push({
      id: subId,
      name: subName,
      mWrite,
      mUpdate,
      mDelete
    });
  }

  return Object.values(groups);
}

module.exports = { getGroupedMenus };