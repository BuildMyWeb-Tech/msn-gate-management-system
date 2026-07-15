// services/userService.js
const repo = require("../repositories/userRepo");

// ─────────────────────────────────────────────────────────────
// SP column names confirmed from debug:
//   uid, username, active, userpassword, MenuAccess, serial_no
//   ResponseCode=100 → data rows
//   ResponseCode=101 → message rows (filter out)
// ─────────────────────────────────────────────────────────────
function isDataRow(r) {
  return r.uid !== undefined || r.username !== undefined;
}

async function getUsers({ companyId, tag }) {
  const rows = await repo.getUsers({ companyId, tag });
  return rows
    .filter(isDataRow)
    .map(r => ({
      uid:      r.uid          ?? 0,
      userName: r.username     ?? r.UserName ?? r.userName ?? "",
      active:   r.active       ?? true,
    }));
}

// ─────────────────────────────────────────────────────────────
// CREATE — Mode 1
// SP returns: ResponseCode=101, ResponseMessage="Saved Successfully", Userid=3
// ─────────────────────────────────────────────────────────────
async function createUser({ companyId, userName, pwd, active }) {
  const rows = await repo.iudUser({
    companyId, mode: 1, uid: 0, userName, pwd, active: active ?? 1,
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  // ResponseCode=101 = success for this SP (confirmed from debug)
  const code    = row?.ResponseCode ?? row?.responseCode;
  const success = code === 101 || code === 100 || !code;
  return {
    success,
    userId:          row?.Userid          ?? row?.UserId       ?? row?.userid ?? null,
    responseMessage: row?.ResponseMessage ?? "User created successfully",
  };
}

// ─────────────────────────────────────────────────────────────
// UPDATE — Mode 2
// ─────────────────────────────────────────────────────────────
async function updateUser({ companyId, uid, userName, pwd, active }) {
  const rows = await repo.iudUser({ companyId, mode: 2, uid, userName, pwd, active });
  const row  = Array.isArray(rows) ? rows[0] : rows;
  return { ResponseMessage: row?.ResponseMessage ?? "User updated successfully" };
}

// ─────────────────────────────────────────────────────────────
// DELETE — Mode 3
// ─────────────────────────────────────────────────────────────
async function deleteUser({ companyId, uid }) {
  const rows = await repo.iudUser({
    companyId, mode: 3, uid, userName: "", pwd: "", active: 0,
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  return { ResponseMessage: row?.ResponseMessage ?? "User deleted successfully" };
}

async function restoreUser({ companyId, uid }) {
  return await repo.undeleteUserById({ companyId, uid });
}

async function getUserPermissions({ companyId, userId }) {
  const raw    = await repo.getUserPermissions({ companyId, userId });
  const menus  = raw.menus  || [];
  const rights = raw.rights || [];
  const rightsMap = {};
  rights.forEach(r => {
    const k = Number(r.MenuDUid ?? r.menudid ?? r.menuDUid ?? 0);
    if (k) rightsMap[k] = r;
  });
  return menus
    .filter(m => m.menudid !== undefined || m.SubMenuName !== undefined)
    .map(m => {
      const mid = Number(m.menudid ?? 0);
      const r   = rightsMap[mid] || {};
      return {
        menuDUid:    mid,
        menuName:    m.SubMenuName ?? m.menuname ?? "",
        parentMenu:  m.menuname    ?? "General",
        permissions: {
          MWrite:  Number(r.MWrite  ?? 0),
          MRead:   Number(r.MRead   ?? 0),
          MUpdate: Number(r.MUpdate ?? 0),
          MDelete: Number(r.MDelete ?? 0),
          MPrint:  Number(r.MPrint  ?? 0),
          UID:     Number(r.UID     ?? 0),
        },
      };
    })
    .filter(m => m.menuDUid > 0);
}

async function savePermissions({ companyId, userId, permissions }) {
  const json   = JSON.stringify({ userId, permissions });
  const result = await repo.savePermissions({ companyId, json });
  const row    = Array.isArray(result) ? result[0] : result;
  return { ResponseMessage: row?.ResponseMessage ?? "Permissions saved successfully" };
}

async function getGroupedMenus({ companyId, userId }) {
  const rows   = await repo.getUserMenus({ companyId, userId });
  const groups = {};
  for (const row of rows) {
    const parentMenu = row.menuname;
    const subName    = row.SubMenuName;
    const subId      = row.menudid;
    if (!parentMenu || !subName) continue;
    const rights = await repo.getMenuRights({ companyId, userId, menuDid: subId });
    if (!groups[parentMenu]) groups[parentMenu] = { menu: parentMenu, subMenus: [] };
    groups[parentMenu].subMenus.push({
      id:      subId,
      name:    subName,
      mWrite:  Number(rights?.MWrite  ?? 0),
      mUpdate: Number(rights?.MUpdate ?? 0),
      mDelete: Number(rights?.MDelete ?? 0),
    });
  }
  return Object.values(groups);
}

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  restoreUser, getUserPermissions, savePermissions, getGroupedMenus,
};