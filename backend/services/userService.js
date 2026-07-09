// services/userService.js
const repo = require("../repositories/userRepo");

async function getUsers({ companyCode, tag }) {
  return await repo.getUsers({ companyCode, tag });
}

async function createUser({ companyCode, userName, pwd, active }) {
  const result = await repo.iudUser({ companyCode, mode: 1, uid: 0, userName, pwd, active: active ?? 1 });
  const row    = result[0];
  return {
    success:         row?.ResponseCode === 101,
    userId:          row?.UserId        ?? null,
    responseMessage: row?.ResponseMessage ?? "Operation completed",
  };
}

async function updateUser({ companyCode, uid, userName, pwd, active }) {
  const result = await repo.iudUser({ companyCode, mode: 2, uid, userName, pwd, active });
  return result[0];
}

async function deleteUser({ companyCode, uid }) {
  const result = await repo.iudUser({ companyCode, mode: 3, uid, userName: "", pwd: "", active: 0 });
  return result[0];
}

async function restoreUser({ companyCode, uid }) {
  return await repo.undeleteUserById({ companyCode, uid });
}

async function getUserPermissions({ companyCode, userId }) {
  const raw    = await repo.getUserPermissions({ companyCode, userId });
  const menus  = raw.menus  || [];
  const rights = raw.rights || [];

  const rightsMap = {};
  rights.forEach((r) => {
    const key = r.MenuDUid ?? r.menudid ?? r.menuDUid;
    if (key != null) rightsMap[Number(key)] = r;
  });

  return menus
    .map((m) => {
      const mid = Number(m.menudid ?? 0);
      const r   = rightsMap[mid] || {};
      return {
        menuDUid:   mid,
        menuName:   m.SubMenuName ?? m.menuname ?? "",
        parentMenu: m.menuname    ?? "General",
        permissions: {
          MWrite:  Number(r.MWrite  ?? false),
          MRead:   Number(r.MRead   ?? false),
          MUpdate: Number(r.MUpdate ?? false),
          MDelete: Number(r.MDelete ?? false),
          MPrint:  Number(r.MPrint  ?? false),
          UID:     Number(r.UID     ?? 0),
        },
      };
    })
    .filter((m) => m.menuDUid > 0);
}

async function savePermissions({ companyCode, userId, permissions }) {
  const json   = JSON.stringify({ userId, permissions });
  const result = await repo.savePermissions({ companyCode, json });
  return result[0];
}

async function getGroupedMenus({ companyCode, userId }) {
  const rows   = await repo.getUserMenus({ companyCode, userId });
  const groups = {};

  for (const row of rows) {
    const parentMenu = row.menuname;
    const subName    = row.SubMenuName;
    const subId      = row.menudid;
    if (!parentMenu || !subName) continue;

    const rights  = await repo.getMenuRights({ companyCode, userId, menuDid: subId });
    const mWrite  = Number(rights?.MWrite  ?? 0);
    const mUpdate = Number(rights?.MUpdate ?? 0);
    const mDelete = Number(rights?.MDelete ?? 0);

    if (!groups[parentMenu]) {
      groups[parentMenu] = { menu: parentMenu, subMenus: [] };
    }
    groups[parentMenu].subMenus.push({
      id: subId, name: subName, mWrite, mUpdate, mDelete,
    });
  }

  return Object.values(groups);
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  getUserPermissions,
  savePermissions,
  getGroupedMenus,
};
