const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.redirect('/auth/login');
};

module.exports = isAdmin;