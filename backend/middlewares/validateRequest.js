const { validationResult } = require("express-validator");
const { sendError } = require("../utils/apiResponse");

const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const first = result.array({ onlyFirstError: true })[0];
  return sendError(res, 400, first?.msg || "Invalid request payload.");
};

module.exports = { validateRequest };
