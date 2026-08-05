import jwt from 'jsonwebtoken'

// Protect normal user routes
export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Unauthorized.'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Save user data in request
    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token or expired.'
    })
  }
}

// Protect admin routes
export const protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Unauthorized.'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded

    // Simple admin check
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      })
    }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token or expired.'
    })
  }
}