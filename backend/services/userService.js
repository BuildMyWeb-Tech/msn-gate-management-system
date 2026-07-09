// backend/services/userService.js
// ✅ FIX: getUserPermissions uses EXACT column names from SP logs:
//   menus  → menudid, SubMenuName, menuname
//   rights → MenuDUid, MRead/MWrite/MUpdate/MDelete/MPrint (boolean true/false)

const repo = require("../repositories/userRepo");

async function getUsers(tag) {
  return await repo.getUsers(tag);
}

async function createUser({ userName, pwd, active }) {
  const result = await repo.iudUser({ mode: 1, userName, pwd, active, uid: 0 });
  const row = result[0];
  return {
    success:         row?.ResponseCode === 101,
    userId:          row?.UserId        ?? null,
    responseMessage: row?.ResponseMessage ?? "Operation completed",
  };
}

async function updateUser({ uid, userName, pwd, active }) {
  const result = await repo.iudUser({ mode: 2, uid, userName, pwd, active });
  return result[0];
}

async function deleteUser({ uid }) {
  const result = await repo.iudUser({ mode: 3, uid, userName: "", pwd: "", active: 0 });
  return result[0];
}

async function restoreUser({ uid }) {
  return await repo.undeleteUser(uid);
}

// ── getUserPermissions ────────────────────────────────────────────────────────
//
// SP: PR_Get_MenuData_ForUsermanagement
// recordsets[0] (menus) columns confirmed from logs:
//   menumuid    → parent menu ID
//   menuname    → parent menu label  e.g. "Setup"
//   menudid     → sub-menu ID        ← THE KEY
//   SubMenuName → sub-menu label     e.g. "Department"
//
// recordsets[1] (rights) columns confirmed from logs:
//   MenuDUid    → matches menudid above
//   MRead, MWrite, MUpdate, MDelete, MPrint  ← booleans (true/false)
//   UID         → rights row ID
//
async function getUserPermissions(userId) {
  const raw    = await repo.getUserPermissions(userId);
  const menus  = raw.menus  || [];
  const rights = raw.rights || [];

  // Build rights lookup keyed by MenuDUid (exact casing from SP)
  const rightsMap = {};
  rights.forEach(r => {
    // MenuDUid is the exact column name confirmed in logs
    const key = r.MenuDUid ?? r.menudid ?? r.menuDUid;
    if (key != null) rightsMap[Number(key)] = r;
  });

  // Flatten menus with their permissions
  const flat = menus
    .map(m => {
      // menudid is the exact column name confirmed in logs
      const mid = Number(m.menudid ?? 0);
      const r   = rightsMap[mid] || {};

      return {
        menuDUid: mid,
        // SubMenuName = sub-menu display name (e.g. "Department")
        menuName:   m.SubMenuName ?? m.menuname ?? "",
        // menuname = parent group label (e.g. "Setup")
        parentMenu: m.menuname    ?? "General",
        permissions: {
          // SP returns JS booleans → Number(true)=1, Number(false)=0
          MWrite:  Number(r.MWrite  ?? false),
          MRead:   Number(r.MRead   ?? false),
          MUpdate: Number(r.MUpdate ?? false),
          MDelete: Number(r.MDelete ?? false),
          MPrint:  Number(r.MPrint  ?? false),
          UID:     Number(r.UID     ?? 0),
        },
      };
    })
    .filter(m => m.menuDUid > 0); // skip rows with no valid ID

  return flat; // controller wraps this in { success: true, data: flat }
}

async function savePermissions(userId, permissions) {
  const json   = JSON.stringify({ userId, permissions });
  const result = await repo.savePermissions(json);
  return result[0];
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  getUserPermissions,
  savePermissions,
};