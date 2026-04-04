const { sendSuccess, sendError } = require("../utils/apiResponse");
const { createNotification, listNotifications, markNotificationRead } = require("../services/notificationService");

const getNotifications = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const data = await listNotifications({
      userId: req.user.id,
      page,
      limit,
    });

    return sendSuccess(res, 200, data, "Notifications fetched successfully.");
  } catch (error) {
    next(error);
  }
};

const postNotification = async (req, res, next) => {
  try {
    const targetUserId = req.body.user_id ? String(req.body.user_id).trim() : req.user.id;
    if (!targetUserId) {
      return sendError(res, 400, "user_id is required.");
    }

    const message = String(req.body.message || "").trim();
    if (!message) {
      return sendError(res, 400, "message is required.");
    }

    const type = String(req.body.type || "info").trim().toLowerCase();
    if (!["success", "error", "warning", "info"].includes(type)) {
      return sendError(res, 400, "type must be one of success, error, warning, info.");
    }

    if (req.user.role !== "admin" && targetUserId !== req.user.id) {
      return sendError(res, 403, "You can only create notifications for yourself.");
    }

    const notification = await createNotification({
      userId: targetUserId,
      message,
      type,
    });

    return sendSuccess(res, 201, { notification }, "Notification created successfully.");
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await markNotificationRead({
      userId: req.user.id,
      notificationId: req.params.id,
    });

    if (!notification) {
      return sendError(res, 404, "Notification not found.");
    }

    return sendSuccess(res, 200, { notification }, "Notification marked as read.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  postNotification,
  markRead,
};
