// services/userService.js
const repo = require("../repositories/userRepo");

// ─────────────────────────────────────────────────────────────
// SP columns confirmed from debug:
//   getUsers:    uid(str), username, active(bool)
//   permissions: menumuid, menuname, menudid, SubMenuName
//   rights:      UID, UserUid, MenuDUid, MRead/Write/Update/Delete/Print (bool)
// ─────────────────────────────────────────────────────────────

function isDataRow(r) {
  return r.uid !== undefined || r.username !== undefined;
}

async function getUsers({ companyId, tag }) {
  const rows = await repo.getUsers({ companyId, tag });
  return rows
    .filter(isDataRow)
    .map(r => ({
      uid:      Number(r.uid ?? 0),
      userName: r.username ?? r.UserName ?? r.userName ?? "",
      active:   r.active ?? true,
    }));
}

async function createUser({ companyId, userName, pwd, active }) {
  const rows = await repo.iudUser({ companyId, mode: 1, uid: 0, userName, pwd, active: active ?? 1 });
  const row  = Array.isArray(rows) ? rows[0] : rows;
  const code = row?.ResponseCode ?? row?.responseCode;
  return {
    success:         !code || code === 101 || code === 100,
    userId:          row?.Userid ?? row?.UserId ?? row?.userid ?? null,
    responseMessage: row?.ResponseMessage ?? "User created successfully",
  };
}

async function updateUser({ companyId, uid, userName, pwd, active }) {
  const rows = await repo.iudUser({ companyId, mode: 2, uid, userName, pwd, active });
  const row  = Array.isArray(rows) ? rows[0] : rows;
  return { ResponseMessage: row?.ResponseMessage ?? "User updated successfully" };
}

async function deleteUser({ companyId, uid }) {
  const rows = await repo.iudUser({ companyId, mode: 3, uid, userName: "", pwd: "", active: 0 });
  const row  = Array.isArray(rows) ? rows[0] : rows;
  return { ResponseMessage: row?.ResponseMessage ?? "User deleted successfully" };
}

async function restoreUser({ companyId, uid }) {
  return await repo.undeleteUserById({ companyId, uid });
}

// ─────────────────────────────────────────────────────────────
// GET permissions — normalise SP response
// recordsets[0] = menus list
// recordsets[1] = existing rights for this user
// ─────────────────────────────────────────────────────────────
async function getUserPermissions({ companyId, userId }) {
  const raw    = await repo.getUserPermissions({ companyId, userId });
  const menus  = raw.menus  || [];
  const rights = raw.rights || [];

  // Build rights map keyed by MenuDUid
  const rightsMap = {};
  rights.forEach(r => {
    const k = Number(r.MenuDUid ?? r.menuDUid ?? 0);
    if (k) rightsMap[k] = r;
  });

  // Filter actual menu rows (has menudid field)
  return menus
    .filter(m => m.menudid !== undefined)
    .map(m => {
      const mid = Number(m.menudid ?? 0);
      const r   = rightsMap[mid] || {};
      return {
        menuDUid:   mid,
        menuName:   m.SubMenuName ?? m.menuname ?? "",
        parentMenu: m.menuname    ?? "General",
        permissions: {
          // SP returns booleans (true/false) — convert to 0/1
          MWrite:  r.MWrite  === true ? 1 : Number(r.MWrite  ?? 0),
          MRead:   r.MRead   === true ? 1 : Number(r.MRead   ?? 0),
          MUpdate: r.MUpdate === true ? 1 : Number(r.MUpdate ?? 0),
          MDelete: r.MDelete === true ? 1 : Number(r.MDelete ?? 0),
          MPrint:  r.MPrint  === true ? 1 : Number(r.MPrint  ?? 0),
          UID:     Number(r.UID ?? 0),
        },
      };
    })
    .filter(m => m.menuDUid > 0);
}

// ─────────────────────────────────────────────────────────────
// SAVE permissions
// PR_Insert_UserMenus uses OPENJSON — send flat array format
// Format that works with OPENJSON:
// [{ MenuDUid, MRead, MWrite, MUpdate, MDelete, MPrint, UserUid }]
// ─────────────────────────────────────────────────────────────
async function savePermissions({ companyId, userId, permissions }) {
  // Convert permissions object to array format for OPENJSON
  // permissions = { [menuDUid]: { MWrite, MRead, MUpdate, MDelete, MPrint } }
  const permArray = Object.entries(permissions).map(([menuDUid, p]) => ({
    MenuDUid: Number(menuDUid),
    UserUid:  userId,
    MRead:    p.MRead   ? 1 : 0,
    MWrite:   p.MWrite  ? 1 : 0,
    MUpdate:  p.MUpdate ? 1 : 0,
    MDelete:  p.MDelete ? 1 : 0,
    MPrint:   p.MPrint  ? 1 : 0,
  }));

  const json   = JSON.stringify(permArray);
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

// exports moved to bottom

// ─────────────────────────────────────────────────────────────
// GET sidebar menus — flat list with CRUD rights
// Called after login and stored in context
// Returns: [{ menudid, menuname, subMenuName, mRead, mWrite, mUpdate, mDelete, mPrint }]
// ─────────────────────────────────────────────────────────────
async function getSidebarMenus({ companyId, userId }) {
  // Use PR_Get_MenuData_ForUsermanagement — same SP as permissions screen
  // Returns 2 recordsets:
  //   [0] = menus list { menumuid, menuname, menudid, SubMenuName }
  //   [1] = rights     { MenuDUid, MRead, MWrite, MUpdate, MDelete, MPrint }
  const raw   = await repo.getUserPermissions({ companyId, userId });
  const menus = raw.menus  || [];
  const rights= raw.rights || [];

  // Build rights map keyed by MenuDUid
  const rightsMap = {};
  rights.forEach(r => {
    const k = Number(r.MenuDUid ?? r.menuDUid ?? 0);
    if (k) rightsMap[k] = r;
  });

  // Also get the menu list from PR_Get_UserMenus to know which menus user can SEE
  // (menus they have access to — filtered by user assignment)
  const userMenuRows = await repo.getUserMenus({ companyId, userId });
  const allowedIds   = new Set(
    userMenuRows
      .filter(r => r.menudid !== undefined)
      .map(r => Number(r.menudid))
  );

  // Combine: only return menus user is assigned to, with their rights
  return menus
    .filter(m => m.menudid !== undefined && allowedIds.has(Number(m.menudid)))
    .map(m => {
      const mid   = Number(m.menudid);
      const r     = rightsMap[mid] || {};
      const toBit = v => v === true ? 1 : Number(v ?? 0);
      return {
        menudid:     mid,
        menuname:    m.menuname    ?? "",
        subMenuName: m.SubMenuName ?? "",
        mRead:   toBit(r.MRead),
        mWrite:  toBit(r.MWrite),
        mUpdate: toBit(r.MUpdate),
        mDelete: toBit(r.MDelete),
        mPrint:  toBit(r.MPrint),
      };
    })
    .filter(m => m.mRead === 1); // Only show menus user can READ
}

// Add to exports
module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  restoreUser, getUserPermissions, savePermissions,
  getGroupedMenus, getSidebarMenus,
};