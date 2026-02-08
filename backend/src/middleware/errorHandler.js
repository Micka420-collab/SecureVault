/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Prisma errors
    if (err.code === 'P2002') {
        return res.status(409).json({
            error: 'A record with this value already exists',
            field: err.meta?.target?.[0],
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            error: 'Record not found',
        });
    }
    
    // Prisma connection errors
    if (err.code?.startsWith('P1')) {
        return res.status(503).json({
            error: 'Database connection error',
            code: 'DB_ERROR',
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            code: 'TOKEN_INVALID',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: err.message,
            code: 'VALIDATION_ERROR',
        });
    }
    
    // Syntax errors (malformed JSON)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Invalid JSON format',
            code: 'SYNTAX_ERROR',
        });
    }
    
    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'Origin not allowed',
            code: 'CORS_ERROR',
        });
    }
    
    // Rate limit errors
    if (err.status === 429) {
        return res.status(429).json({
            error: 'Too many requests, please try again later',
            code: 'RATE_LIMIT',
            retryAfter: err.headers?.['Retry-After'],
        });
    }

    // Default error - don't leak error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        error: isProduction ? 'Internal server error' : err.message,
        code: isProduction ? 'INTERNAL_ERROR' : undefined,
        ...(isProduction ? {} : { stack: err.stack }),
    });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
