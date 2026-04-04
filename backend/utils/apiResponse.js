const sendSuccess = (res, statusCode, data = {}, message = "Success") => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

const sendError = (res, statusCode, message = "Something went wrong") => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
