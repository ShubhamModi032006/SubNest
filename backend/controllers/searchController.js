const { sendSuccess, sendError } = require("../utils/apiResponse");
const { cached } = require("../services/cacheService");
const { globalSearch } = require("../services/searchService");

const search = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    if (!q) {
      return sendError(res, 400, "Query parameter 'q' is required.");
    }

    const cacheKey = `search:${q}:${page}:${limit}`;
    const data = await cached(
      cacheKey,
      () => globalSearch({ query: q, page, limit }),
      { ttlMs: 30_000, tags: ["search"] }
    );

    return sendSuccess(res, 200, data, "Global search fetched successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  search,
};
