function validateLogin(body) {
  const { username, password } = body;

  if (!username || !password) {
    return "Username and password are required";
  }

  return null;
}

module.exports = { validateLogin };