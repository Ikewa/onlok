/**
 * Pagination Middleware
 * Automatically parses page and limit from query params
 */
const paginate = (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    req.pagination = {
        page,
        limit,
        startIndex
    };

    next();
};

module.exports = { paginate };
