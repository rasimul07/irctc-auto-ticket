function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

function sendError(res, code, message, status = 400) {
  return res.status(status).json({
    ok: false,
    error: { code, message }
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { sendSuccess, sendError, asyncHandler };
