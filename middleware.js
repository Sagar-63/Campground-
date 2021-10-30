module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        //flash
        req.session.returnTo=req.originalUrl;
       return res.redirect('/login');
    }
    next();
}

