const authRepo = require("../repositories/authRepo");

async function login(username, password) {
  const result = await authRepo.validateUser(username, password);

  if (result.ResponseCode === 100) {
    return {
      success: true,
      userId: result.Userid,
    };
  }

  return {
    success: false,
    message: result.ResponseMessage,
  };
}

module.exports = { login };